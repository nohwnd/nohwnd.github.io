---
title: The shortest way to a WPF App
date: 2019-06-15 08:00:00
tags: 
 - powershell
 - wpf
 - xaml

categories:
 - article
---

I often see a lot of unnecessary code in WPF demos in PowerShell, so I want to share the most barebone version that still works correctly. 

You don't need to use `New-Object System.Xml.XmlNodeReader $xaml`, and you don't need `[Windows.Markup.XamlReader]::Load($reader)`. Just use `Parse`.

You also don't need the `x` and `d` namespaces (most of the time) so you can remove them as well. 

Just make sure that the `$xaml` variable has type `[string]`, and you can get a working app in just few lines of code.

```powershell
Add-Type -AssemblyName PresentationFramework

[String]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
    <Grid>
        <Label FontSize="100" Name="Text" /> 
    </Grid>
</Window>
"@

$Window = [Windows.Markup.XamlReader]::Parse($xaml)

$Text = $Window.Content.FindName("Text")
$Text.Content = "👋, from WPF!"

$Window.ShowDialog()
```

