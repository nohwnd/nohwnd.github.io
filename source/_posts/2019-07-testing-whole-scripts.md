---
title: Testing self-contained scripts with Pester
date: 2019-06-09 08:00:00
tags: 
 - powershell
 - pester
 - testing
 - ps1
categories:
 - article
---

Testing a self-contained script file with Pester is difficult. I visited this idea few times before, for [example here](http://jakubjares.com/2015/01/10/test-script-end-to-end/) and never reached a solution that I would like, but every time I am getting closer and closer.

<!-- more -->

## What is a self-contained script? 

A self-contained script is a script that does some work when you run it by invoking functions it defines. For example saving the following code in `script1.ps1` file and running it, would return 🥑.

```powershell 
function Get-Avocado {
    '🥑'
}

Get-Avocado
```

## Why is this a problem? 

Testing such script with Pester is difficult, because the `Get-Avocado` function is invoked every time the script is dot-sourced into the test script. 
```powershell
. $PSScriptRoot/script1.ps1 

Describe "Get-Avocado" {
    It "gets avocado" {
        Get-Avocado | Should -Be 🥑
    }
}
```

```log
# output

🥑 <---  this should not be here, and comes from 
         dot-sourcing the script

Describing Get-Avocado
  [+] gets avocado 93ms
```

In this case it is not the end of the world, all you get is a bit of extra output to the screen. 

In the real world though, the entry point function to your script will do a lot more than just write to a screen, and this extra execution will become a problem. 

## Making it better

To successfully cover this script with tests we need to skip running the entry point function. This can be done in multiple ways, but the best way I came up with so far is "shadowing" the entry point function with a temporary alias. Aliases are resolved before functions, and are defined accross script boundaries, so effectively we replace the call to `Get-Avocado` with call to function `f` that does nothing. 


In code that would look like this:

```powershell
function f () {}
New-Alias -Name Get-Avocado -Value f
. $PSScriptRoot/script1.ps1 
Remove-Alias -Name Get-Avocado
Remove-Item "function:/f"

Describe "Get-Avocado" {
    It "gets avocado" {
        Get-Avocado | Should -Be 🥑
    }
}
```

```log
# output

   <--- no extra output here

Describing Get-Avocado
  [+] gets avocado 93ms
```

## Making it awesome

This approach is simple and clear, but providing it as a reusable solution would be much better. So I did just that, and created [ImportTestScript module](https://www.powershellgallery.com/packages/ImportTestScript) and published it to PSGallery. 

```powershell 
Import-Script `
    -EntryPoint Get-Avocado `
    -Path $PSScriptRoot/script1.ps1 

Describe "Get-Avocado" {
    It "gets avocado" {
        Get-Avocado | Should -Be 🥑
    }
}
```
```log
# output

   <--- no extra output here

Describing Get-Avocado
  [+] gets avocado 93ms
```

As you can see I am calling the `Import-Script` function and providing it with the path to the script to import, and the name of the entry point function. The default value here is `Main`, but you can choose whatever suits your needs. 

> Doing the outlined operations from the inside of a module is a bit more involved, but you can find it described here in [this gist](https://gist.github.com/nohwnd/509476b85f43b501033103d838c84789).

 
## Summary

Shadowing functions with aliases is a great technique that can be used to test scripts that invoke the functions that they define. Following a very simple rule of calling just a single function to start the whole script,  will allow you to replace it easily with the provided module and test as much as you can from your script. 