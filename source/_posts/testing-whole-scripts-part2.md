---
title: Testing self-contained scripts with Pester, part 2
date: 2019-06-14 08:00:00
tags: 
 - powershell
 - pester
 - testing
 - ps1
categories:
 - article
---

Few days ago I [posted about a tiny module](http://jakubjares.com/2019/06/09/2019-07-testing-whole-scripts/) I wrote to skip the entry point function in a script. I got few reactions telling me that there are better ways to organize your scripts, and they were all correct. Putting your code into a module and distributing it that way, or splitting the script into different files and combining them during build are both better than having a single file with everything. 

<!-- more -->

The post was not a recommendation how to write your scripts *all the time*, instead it just described a technique that you can use when needed. One such case is when you are providing scripts to others that do not know PowerShell. Providing a single self-contained script is simpler than distributing, importing and invoking a module. I also find it useful for build scripts, or scripts in scheduled tasks.


## Testing entry point function invocation

There are probably other possible use cases, but this is the one I am using this module for. To test that parameters are passed correctly to the entrypoint function. In my case the entrypoint function does an involved, and destructive action, so I cannot simply invoke the whole script and check result, without setting up the whole environment for it. 

Below I will show the same thing on a function that has non-destructive behavior, so a better way to test it would be to simple invoke the whole script and check the result. So keep that in mind. 

```powershell
# file script1.ps1

[CmdletBinding(DefaultParameterSetName="SelectOne")]
param (
    [Parameter(ParameterSetName="SelectOne", Mandatory)]
    [ValidateSet("Avocado", "Orange", "Pear")]
    $Name,
    [Parameter(ParameterSetName="Random")]
    [Switch] $Random
)

function Get-Fruit {
    [CmdletBinding(DefaultParameterSetName="SelectOne")]
    param (
        [Parameter(ParameterSetName="SelectOne", Mandatory)]
        [ValidateSet("Avocado", "Orange", "Pear")]
        $Name,
        [Parameter(ParameterSetName="Random")]
        [Switch] $Random
    )

    $emojis = @{ 
        "Avocado" = "🥑"
        "Orange" = "🍊"
        "Pear" = "🍐"
    }

    if ($Random) {
        $k = Get-Random -Collection ($emojis.Keys)
        return $emojis[$k]    
    }
    
    $emojis[$Name]
}

# the next line is very hard to test
Get-Fruit @PSBoundParameters
```

Our `Get-Avocado` function was renamed to `Get-Fruit` and now can return different emojis, or a random one. I am invoking it from the script and passing some mandatory parameters, in two parameter sets.

```powershell
# file script1.Tests.ps1

$script = "$PSScriptRoot/script1.ps1"

Import-Script `
    -EntryPoint Get-Fruit `
    -Parameters @{ Random = $true } `
    -Path $script

Describe "Pass the parameters to the entry point function" {
    It "Passes Random" {
        Mock Get-Fruit 

        & $script -Random 

        Assert-MockCalled Get-Fruit `
            -ParameterFilter { $true -eq $Random }
    }

    It "Passes Name" {
        Mock Get-Fruit 

        & $script -Name Avocado

        Assert-MockCalled Get-Fruit `
            -ParameterFilter { "Avocado" -eq $Name }
    }
}

Describe "Get-Fruit" {
    It "gets avocado" {
        Get-Fruit -Name Avocado | Should -Be 🥑
    }

    It "gets orange" {
        Get-Fruit -Name Orange | Should -Be 🍊
    }

    It "gets pear" {
        Get-Fruit -Name Pear | Should -Be 🍐
    }
}
```

In the test I am then importing the script, passing in the `Random` switch, to make sure I am able to run the script. The call to `Get-Fruit` is still replaced by the mock so I am able to import the script without ever invoking `Get-Fruit`. 

At that moment I have the `Get-Fruit` imported to my local scope and can mock it. Which in turn means that I can test just the `param` block on the top of the script. 

## Summary 

This admittedly tests just a tiny slice of the script, but a bit that would be impossible to test otherwise. Go ahead and try to comment out the invocation of the `Get-Fruit` function. You should see that all the unit tests still pass, but the script does nothing. And that is the whole goal, to be able to test every single line of the code. You don't have to do it, but it is nice to have the possibility. 


