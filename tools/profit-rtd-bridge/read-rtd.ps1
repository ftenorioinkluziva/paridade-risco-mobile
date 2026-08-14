    [CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [Alias("Assets")]
    [string[]]$Asset,

    [string]$AssetsUrl,

    [int]$AssetRefreshMilliseconds = 5000,

    [string]$Topic,

    [string[]]$Fields = @(
        "QUOTE.DESCRIPTION",
        "QUOTE.ASSET",
        "QUOTE.SECURITY_TYPE",
        "QUOTE.BID_PRICE",
        "QUOTE.ASK_PRICE",
        "QUOTE.CHGPERCENT",
        "QUOTE.LAST_TRADE_PRICE",
        "QUOTE.LAST_TRADE_QUANTITY",
        "QUOTE.BID_QUANTITY",
        "QUOTE.ASK_QUANTITY",
        "QUOTE.CLOSE",
        "QUOTE.PREV_CLOSE",
        "QUOTE.OPEN",
        "QUOTE.HIGH",
        "QUOTE.LOW",
        "QUOTE.CHANGE",
        "QUOTE.CHANGE_PERCENT",
        "QUOTE.NUM_TRADES",
        "QUOTE.QUANTITY"
    ),

    [switch]$Watch,

    [int]$IntervalMilliseconds = 250,

    [int]$DurationSeconds = 0,

    [string]$PostUrl,

    [string]$BearerToken
)

$ErrorActionPreference = "Stop"
$source = "BTG_TRADE_DESK"

function Convert-RtdValue {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return $null
    }

    if ($Value -is [DateTime]) {
        return $Value.ToString("o", [Globalization.CultureInfo]::InvariantCulture)
    }

    return [string]$Value
}

function Find-BtgRtdAssembly {
    $packageRoot = Join-Path $env:LOCALAPPDATA "Packages"
    $candidate = Get-ChildItem -Path $packageRoot -Filter "RTD.Client.dll" -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like "*\BTGTraderDesk\RTD\RTD.Client.dll" } |
        Select-Object -First 1

    if ($null -eq $candidate) {
        throw "RTD.Client.dll do BTG Trader Desk não foi encontrado. Abra o Trader Desk e ative o RTD local antes de iniciar a bridge."
    }

    return $candidate.FullName
}

function Normalize-AssetTickers {
    param([AllowNull()][string[]]$Tickers)

    if ($null -eq $Tickers) {
        return @()
    }

    @($Tickers |
        Where-Object { $null -ne $_ } |
        ForEach-Object { $_.Split(",") } |
        Where-Object { $null -ne $_ } |
        ForEach-Object { $_.Trim().ToUpperInvariant() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -Unique)
}

function Get-BtgAssetTickers {
    if ([string]::IsNullOrWhiteSpace($AssetsUrl)) {
        return @()
    }

    $response = Invoke-RestMethod -Method Get -Uri $AssetsUrl
    $items = @($response)
    $tickers = @($items | ForEach-Object {
        if ($_ -is [string]) { $_ } else { $_.ticker }
    })
    return Normalize-AssetTickers $tickers
}

function Publish-Snapshot {
    param(
        [Parameter(Mandatory = $true)] [string]$SnapshotAsset,
        [Parameter(Mandatory = $true)] [string]$SnapshotTopic,
        [Parameter(Mandatory = $true)] [System.Collections.IDictionary]$SnapshotFields,
        [string]$SnapshotPostUrl,
        [string]$SnapshotBearerToken
    )

    $snapshot = [ordered]@{
        source = "BTG_TRADE_DESK"
        asset = $SnapshotAsset.Trim().ToUpperInvariant()
        topic = $SnapshotTopic
        receivedAt = [DateTime]::UtcNow.ToString("o", [Globalization.CultureInfo]::InvariantCulture)
        fields = $SnapshotFields
    }
    $json = $snapshot | ConvertTo-Json -Depth 5 -Compress
    if ($SnapshotPostUrl) {
        if (-not $SnapshotBearerToken) { throw "BearerToken é obrigatório quando PostUrl é informado." }
        Invoke-RestMethod -Method Post -Uri $SnapshotPostUrl -Headers @{ Authorization = "Bearer $SnapshotBearerToken" } -ContentType "application/json" -Body $json | Out-Null
    }
    return $json
}

$btgServer = $null
try {
    if ($IntervalMilliseconds -lt 50) {
        throw "IntervalMilliseconds deve ser pelo menos 50."
    }
    if ($AssetRefreshMilliseconds -lt 1000) {
        throw "AssetRefreshMilliseconds deve ser pelo menos 1000."
    }
    if ([string]::IsNullOrWhiteSpace($AssetsUrl) -and @(Normalize-AssetTickers $Asset).Count -eq 0) {
        throw "Informe Asset ou AssetsUrl para descobrir os ativos BTG."
    }

    $btgAssemblyPath = Find-BtgRtdAssembly
    $btgAssembly = [Reflection.Assembly]::LoadFrom($btgAssemblyPath)
    $serverType = $btgAssembly.GetType("EFS.RTD.Client.RTDServerDesk")
    $topicType = $btgAssembly.GetType("EFS.RTD.Client.RTDTopic")
    if ($null -eq $serverType -or $null -eq $topicType) {
        throw "A instalação do BTG não expôs os tipos esperados do RTD."
    }

    # O ServerStart público tenta abrir Excel.Application. A inicialização TCP
    # usada pelo Trader Desk não depende do Excel.
    $btgServer = [Activator]::CreateInstance($serverType)
    $genericDictionary = [type]::GetType("System.Collections.Generic.Dictionary" + [char]96 + "2")
    $genericQueue = [type]::GetType("System.Collections.Generic.Queue" + [char]96 + "1")
    $serverType.GetField("_topics", [Reflection.BindingFlags]"Instance,NonPublic").SetValue(
        $btgServer,
        [Activator]::CreateInstance($genericDictionary.MakeGenericType([int], $topicType))
    )
    $serverType.GetField("_tradingtopics", [Reflection.BindingFlags]"Instance,NonPublic").SetValue(
        $btgServer,
        [Activator]::CreateInstance($genericDictionary.MakeGenericType([string], $topicType))
    )
    $serverType.GetField("_responseQueue", [Reflection.BindingFlags]"Instance,NonPublic").SetValue(
        $btgServer,
        [Activator]::CreateInstance($genericQueue.MakeGenericType($topicType))
    )

    $serverType.GetMethod("InitializeTcpClient", [Reflection.BindingFlags]"Instance,NonPublic").Invoke($btgServer, @()) | Out-Null
    $tcpClient = $serverType.GetField("_tcpClient", [Reflection.BindingFlags]"Instance,NonPublic").GetValue($btgServer)
    for ($attempt = 1; $attempt -le 20 -and -not $tcpClient.IsConnected; $attempt++) {
        Start-Sleep -Milliseconds 250
    }
    if (-not $tcpClient.IsConnected) {
        throw "O Trader Desk não aceitou a conexão RTD local em 127.0.0.1:9099. Confirme que o aplicativo está aberto, conectado e com o RTD ativo."
    }

    $script:btgServer = $btgServer
    $script:assetTickers = [System.Collections.Generic.List[string]]::new()
    $script:assetTickerSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $script:valuesByAsset = [ordered]@{}
    $script:topicByAsset = [ordered]@{}
    $script:subscriptions = [System.Collections.Generic.List[object]]::new()
    $script:topicId = 1
    $script:bridgeFields = @($Fields)
    $script:marketValueFields = @(
        "QUOTE.BID_PRICE",
        "QUOTE.ASK_PRICE",
        "QUOTE.LAST_TRADE_PRICE",
        "QUOTE.CLOSE",
        "QUOTE.OPEN",
        "QUOTE.HIGH",
        "QUOTE.LOW"
    )
    $script:tradingTopicsField = $serverType.GetField("_tradingtopics", [Reflection.BindingFlags]"Instance,NonPublic")
    $staticTickers = Normalize-AssetTickers $Asset
    $script:customTopic = if ([string]::IsNullOrWhiteSpace($AssetsUrl) -and $staticTickers.Count -eq 1 -and -not [string]::IsNullOrWhiteSpace($Topic)) { $Topic } else { $null }

    function Add-BtgAssetSubscriptions {
        param([string[]]$NewTickers)

        foreach ($assetTicker in (Normalize-AssetTickers $NewTickers)) {
            if ($script:assetTickerSet.Contains($assetTicker)) { continue }

            $script:assetTickerSet.Add($assetTicker) | Out-Null
            $script:assetTickers.Add($assetTicker)
            $script:valuesByAsset[$assetTicker] = [ordered]@{}
            $script:topicByAsset[$assetTicker] = if ($null -ne $script:customTopic) { $script:customTopic } else { $assetTicker }

            foreach ($field in $script:bridgeFields) {
                $normalizedField = $field.Trim().ToUpperInvariant()
                if ([string]::IsNullOrWhiteSpace($normalizedField)) { continue }

                # O BTG recebe os argumentos na mesma ordem das fórmulas RTD:
                # campo primeiro e ativo no último argumento.
                $strings = [object[]]@($normalizedField, $assetTicker)
                $getNewValues = $true
                $script:btgServer.ConnectData($script:topicId, [ref]$strings, [ref]$getNewValues) | Out-Null
                $script:valuesByAsset[$assetTicker][$normalizedField] = $null
                $script:subscriptions.Add([pscustomobject]@{
                    Asset = $assetTicker
                    Field = $normalizedField
                    Key = "$normalizedField|$assetTicker"
                })
                $script:topicId++
            }

            [Console]::Error.WriteLine("BTG RTD: ativo assinado $assetTicker")
        }
    }

    function Refresh-BtgAssetSubscriptions {
        $discoveredTickers = Get-BtgAssetTickers
        if ($discoveredTickers.Count -eq 0) {
            throw "AssetsUrl não retornou ativos BTG cadastrados."
        }
        Add-BtgAssetSubscriptions $discoveredTickers
    }

    if (-not [string]::IsNullOrWhiteSpace($AssetsUrl)) {
        Refresh-BtgAssetSubscriptions
    } else {
        Add-BtgAssetSubscriptions $staticTickers
    }

    function Update-BtgValues {
        $tradingTopics = $script:tradingTopicsField.GetValue($script:btgServer)
        foreach ($subscription in $script:subscriptions) {
            if ($tradingTopics.ContainsKey($subscription.Key)) {
                $script:valuesByAsset[$subscription.Asset][$subscription.Field] = Convert-RtdValue $tradingTopics[$subscription.Key].ValueObject
            }
        }
    }

    function Test-BtgAssetHasMarketValue {
        param([System.Collections.IDictionary]$Values)

        @($script:marketValueFields | Where-Object {
            $value = $Values[$_]
            $null -ne $value -and $value -ne ""
        }).Count -gt 0
    }

    $initialDeadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        Start-Sleep -Milliseconds $IntervalMilliseconds
        Update-BtgValues
        $hasValue = @($script:valuesByAsset.Values | ForEach-Object { $_.Values } | Where-Object { $null -ne $_ -and $_ -ne "" }).Count -gt 0
    } while (-not $hasValue -and [DateTime]::UtcNow -lt $initialDeadline)

    $lastSignatures = @{}
    $publish = {
        Update-BtgValues
        foreach ($assetTicker in $script:assetTickers) {
            $values = $script:valuesByAsset[$assetTicker]
            if (-not (Test-BtgAssetHasMarketValue $values)) { continue }
            $signature = $values | ConvertTo-Json -Depth 5 -Compress
            if (-not $lastSignatures.ContainsKey($assetTicker) -or $signature -ne $lastSignatures[$assetTicker]) {
                $lastSignatures[$assetTicker] = $signature
                Write-Output (Publish-Snapshot -SnapshotAsset $assetTicker -SnapshotTopic $script:topicByAsset[$assetTicker] -SnapshotFields $values -SnapshotPostUrl $PostUrl -SnapshotBearerToken $BearerToken)
            }
        }
    }
    & $publish

    if ($Watch) {
        $startedAt = [DateTime]::UtcNow
        $nextAssetRefreshAt = [DateTime]::UtcNow.AddMilliseconds($AssetRefreshMilliseconds)
        while ($true) {
            Start-Sleep -Milliseconds $IntervalMilliseconds
            if ($DurationSeconds -gt 0 -and ([DateTime]::UtcNow - $startedAt).TotalSeconds -ge $DurationSeconds) {
                break
            }
            if (-not [string]::IsNullOrWhiteSpace($AssetsUrl) -and [DateTime]::UtcNow -ge $nextAssetRefreshAt) {
                try {
                    Refresh-BtgAssetSubscriptions
                } catch {
                    [Console]::Error.WriteLine("BTG RTD: não foi possível atualizar a lista de ativos: $($_.Exception.Message)")
                }
                $nextAssetRefreshAt = [DateTime]::UtcNow.AddMilliseconds($AssetRefreshMilliseconds)
            }
            & $publish
        }
    }
}
catch {
    [Console]::Error.WriteLine("$($_.Exception.Message) (linha $($_.InvocationInfo.ScriptLineNumber): $($_.InvocationInfo.Line.Trim())")
    exit 1
}
finally {
    if ($null -ne $btgServer) {
        try { $btgServer.ServerTerminate() | Out-Null } catch { }
    }
}
