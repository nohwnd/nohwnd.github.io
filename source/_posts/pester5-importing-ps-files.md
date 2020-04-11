
---
title: Pester5 - importing your ps1 files
date: 2020-04-11 10:00:00
tags: 
 - powershell
 - pester 
 - pester5
categories:
 - article
---


In [Pester 5](https://github.com/pester/Pester/blob/v5.0/README.md#put-setup-in-beforeall) you should put your script setup inside of a `BeforeAll` block. If you are still using this historical approach, then it will no longer work: 


```powershell
BeforeAll {
    $here = Split-Path -Parent $MyInvocation.MyCommand.Path
    $sut = (Split-Path -Leaf $MyInvocation.MyCommand.Path).Replace(".Tests.", ".")
    . "$here\$sut"
}

Describe "Get-Emoji" {
    It "Gets cactus" {

    }
}
```

<!-- more -->

Running this script will throw the following exception: 

```
Starting test discovery in 1 files.
Discovering tests in C:\tests\Get-Emoji.Tests.ps1.
Found 1 tests. 66ms
Test discovery finished. 126ms


Running tests from 'C:\tests\Get-Emoji.Tests.ps1'
Container 'C:\tests\Get-Emoji.Tests.ps1' failed with:
System.Management.Automation.ParameterBindingValidationException: Cannot bind argument to parameter 'Path' because it is null.
   at System.Management.Automation.ExceptionHandlingOps.CheckActionPreference(FunctionContext funcContext, Exception exception)
   at System.Management.Automation.Interpreter.ActionCallInstruction`2.Run(InterpretedFrame frame)
   at System.Management.Automation.Interpreter.EnterTryCatchFinallyInstruction.Run(InterpretedFrame frame)
   at System.Management.Automation.Interpreter.EnterTryCatchFinallyInstruction.Run(InterpretedFrame frame)
```

This is an unfortunate side-effect or your code running in a function rather than directly in the script. In such case `$MyInvocation.MyCommand.Path` is not defined, and you will get `$null`. 

This is also your prompt to replace this approach that was outdated since 2012 when PowerShell 3 was released.

The recommended way is to replace that monster with one of these approaches, that are more succint, uneffected by running in a function and cross-platform: 

```powershell
BeforeAll {
   . $PSCommandPath.Replace('.Tests.ps1', '.ps1')
}

Describe 'Get-Emoji' {
    # etc. 
}
```

```powershell
BeforeAll {
   . $PSCommandPath.Replace('.Tests', '')
}

Describe 'Get-Emoji' {
    # etc. 
}
```

Or if you don't use the standard convention, or like to spell out the name of the file, do this: 

```powershell
BeforeAll {
   . $PSScriptRoot/Get-Emoji.ps1
}

Describe 'Get-Emoji' {
    # etc. 
}
```

## Does this affect all other `$MyInvocation.MyCommand.Path`? 

No. This change does not affect all other `$MyInvocation.MyCommand.Path`. If you module uses it, then it will continue to work. The breaking change in Pester is because the `$here\$sut` snippet relies on the fact that it runs directly in the script. Running `$MyInvocation.MyCommand.Path` in any function will make the Path property undefined:

```powershell
"in script: -$($MyInvocation.MyCommand.Path)-"

function f () { "in function: -$($MyInvocation.MyCommand.Path)-" }
f

# output: 
in script: -C:\temp\script.ps1-
in function: --
```

## Functions form their own scope don't they?

You might be wondering how come that your script is actually dot-sourced in the correct scope when you are the problem is that you are running in a function. And functions make their own scope. And you would be right to wonder. 

`BeforeAll` relies on the fact that modules have their own session state, and that script also has its own session state. The scopes in both are tracked independetly, which allows me to take your ScriptBlock and dot-source it into the correct scope. And because you already dot-sourced into that scriptblock your functions and variables will end up in the correct scope place. 

Here a quick example of what happens internally:

```powershell
Get-Module p | Remove-Module

New-Module -Name p -ScriptBlock { 
    function BeforeAll ($ScriptBlock) { 
        . $ScriptBlock
    }
}

$s = $null
"s is null: $($s -eq $null)"

BeforeAll { . $PSScriptRoot/s.ps1 }

"s is 10: $($s -eq 10)"
``` 

## Summary 

The `. $here\$sut` approach to importing scripts is very outdated. Don't use it. It won't work in Pester 5, when you move it to `BeforeAll`.