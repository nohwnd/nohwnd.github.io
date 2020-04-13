---
title: Pester5 - discovery and script setup
date: 2020-04-11 10:00:00
tags: 
 - powershell
 - pester 
 - pester5
categories:
 - article
---


As described in the [v5 readme](https://github.com/pester/Pester/blob/v5.0/README.md#put-setup-in-beforeall), the fundamental change in Pester5 is that Pester now runs in two phases: Discovery and Run. During Discovery Pester finds all your tests, groups them together and filters them based on your filters. Then in the Run phase it will actually run them.

Splitting the work into two distinct phases, powers many of the features in this release, and enables many others to be implemented in the future. 

For Discovery to work correctly, there are new rules to follow: 


**Put all your code into `It`, `BeforeAll`, `BeforeEach`, `AfterAll` or `AfterEach`. Put no code directly into `Describe`, `Context` or on the top of your file, without wrapping it in one of these blocks, unless you have a good reason to do so.**

**All misplaced code will run during Discovery, and its results won't be available during Run.**

This article offers more guidance and shows examples of what it means.

<!-- more -->

## Why?

Putting all your code in the `It`, `BeforeAll`, `BeforeEach`, `AfterAll` or `AfterEach` will give Pester control of all your code, and it can decide when is the best time to execute it, or decide to not execute it at all. 

For example here we have a test file that contains Windows and Linux acceptance tests. It uses `-Tag` to specify that these tests are acceptance tests, and uses `-Skip` to decide if the tests should run on the current platform. This test file follows the new rule, and correctly places both the file setup and the block setup in `BeforeAll`: 

```powershell
BeforeAll {
    # file setup
    Start-Sleep -Seconds 1
}

Describe "Linux acceptance" -Tag "Acceptance" -Skip:(!$IsLinux) {
    BeforeAll {
        # block setup
        Start-Sleep -Seconds 1
    }

    It "linux test" { 
        # your test code
    }
}

Describe "Windows acceptance" -Tag "Acceptance" -Skip:(!$IsWindows) {
    It "windows test" { 
        # your test code
    }
}
```

When we specify `-ExcludeTagFilter 'Acceptance'`, there will be no tests to run, and Pester returns almost immediately:

```shell
PS C:\tests> Invoke-Pester  -ExcludeTagFilter "Acceptance"


Starting test discovery in 1 files.
Discovering tests in C:\tests\xplat-correct.Tests.ps1.
Found 2 tests. 8ms
Test discovery finished. 16ms
Tests completed in 11ms
Tests Passed: 0, Failed: 0, Skipped: 0, Total: 2, NotRun: 2
```

This is because Pester was able to collect all tests without running any of your code, and see that all tests are filtered out. So it executed nothing.

### Not following the rules

Now let's see what happens if our code **DOES NOT** follow the new rule, and instead puts the code directly into the `Describe` block, as we would in Pester 4:

```powershell
# file setup such as . $PSScriptRoot/MyCommand.ps1
Start-Sleep -Seconds 1

Describe "Linux acceptance" -Tag "Acceptance" -Skip:(!$IsLinux) {
    # block setup
    Start-Sleep -Seconds 1

    It "linux test" { 
        # your test code
    }
}

Describe "Windows acceptance" -Tag "Acceptance" -Skip:(!$IsWindows) {
    It "windows test" { 
        # your test code
    }
}
```

Excluding all tests in this file will take **more than 2 seconds** to complete:

```shell
PS C:\tests> Invoke-Pester  -ExcludeTagFilter "Acceptance"

Starting test discovery in 1 files.
Discovering tests in C:\tests\xplat-wrong.Tests.ps1.
Found 2 tests. 2.06s
Test discovery finished. 2.07s
Tests completed in 2.07s
Tests Passed: 0, Failed: 0, Skipped: 0, Total: 2, NotRun: 2
```

The run takes 2 seconds, because Pester executed the script to discover tests in it, and it immediately hit the `Start-Sleep`. Once it was done waiting it continued and hit the second `Start-Sleep` and waited again for 1 second. 

Pester then finishes the discovery and processes the tests. It sees that all tests are filtered out, and that there is nothing to execute and returns.


## How discovery works?

As you could see in the previous example Discovery just saved us 2 seconds of execution time, which is pretty amazing if you ask me. So how does it work? 

It is actually very simple. During the discovery phase Pester will invoke the `.Tests.ps1` like you would with any other file. The trick is that while `Describe` and `Context` will invoke the ScriptBlock you provided, the `It`, `BeforeAll`, `BeforeEach`, `AfterAll` or `AfterEach` will not. Instead they will store it to internal state and continue. Here is a model of the whole process:

```powershell
$script:Tests = @()

function Describe ($Name, $ScriptBlock) {
    Write-Host "-> Describe function executed" -ForegroundColor Magenta
    & $ScriptBlock
}

function It ($Name, $ScriptBlock) {
    Write-Host "  -> It function executed" -ForegroundColor Magenta
    $script:Tests += $ScriptBlock
}

Write-Host "Discovery start" -ForegroundColor Magenta
Describe "d1" {
    Write-Host "-> Describe scriptblock was executed" 
    It "i1" {
        Write-Host " -> It scriptblock was executed"
    }
}
Write-Host "Discovery done" -ForegroundColor Magenta

Write-Host "Run start" -ForegroundColor Cyan
foreach ($test in $script:Tests) {
    & $test
}
Write-Host "Run start" -ForegroundColor Cyan

```

If you run it in a console you will see this output: 

```shell
Discovery start
-> Describe function executed
-> Describe scriptblock was executed
  -> It function executed
Discovery done
Run start
 -> It scriptblock was executed
Run start
```

The message from the `It` ScriptBlock does not appear during discovery, because it is not executed. Instead we finish discovery, and then in the Run phase we run the test. 

## When is it okay to break the new rule? 

There are few situations where you will knowingly or unknowingly break the new rule, and that is okay, as long as you know what you are doing. 

A common case is when you specify `-Skip` with a custom condition, as we did in our previous example `-Skip:(!$IsWindows)`. 

This is technically breaking the rule, but in this case it is totally okay. The condition will evaluate very quickly, and as you saw in the results it had no negative impact on our discovery speed. 

You might also decide to define your own functions, to determine whether or not the test should be skipped. And in that case it is okay to define them direcly in the file setup or `Describe`. Just assume that these function will be available only during Discovery. Sometimes that might mean that you will have similar setup in your `BeforeAll` and in your discovery setup.

And also make those functions execute as fast as possible by leveraging readonly global variables, caching, or similar techniques. More examples later.

## Summary

Discovery is what powers a lot of the new features in Pester 5, and the way it works is actually quite simple. To keep it fast, keep your code inside of the leaf blocks.