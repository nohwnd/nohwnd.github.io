---
title: Pester - Using Because in tests
date: 2017-12-19 06:33:32
tags: 
 - pester
 - testing
 - powershell
 - best practice
 - assertion
categories:
 - article
---

This weekend I added custom failure reasons into Pester. This feature I know and love from [Fluent Assertions](http://fluentassertions.com/), so let me show you how I would use it in Pester.

> 🔥 This feature is not released yet, get pre-release [version 4.2.0-alpha3](https://www.powershellgallery.com/packages/Pester/4.2.0-alpha3) to use it.

## Because parameter

The new feature adds an optional `-Because` parameter to all `Should` assertions. The parameter allows you to specify a reason that will be shown when assertion fails, like so:

```powershell
Describe 'Health check' {
    # mock is here only to make the example work
    Mock Get-Service { [PSCustomObject]@{ Status = 'Stopped' } }

    It 'is protected by antivirus' {
        $service = Get-Service -Name AntivirusService
        $running = [ServiceProcess.ServiceControllerStatus]::Running

        $service.Status |
            Should -Be $running -Because 'antivirus must be running to protect our computer'
    }
}

# fails with
# Describing Health check
#   [-] is protected by antivirus 80ms
#     Expected {Running}, because antivirus must be running to protect our computer, but got {Stopped}.
```

As you can see the reason is written in the assertion failure message, between the expectation and the `but`. This immediately reminds you why you've put the test in place, and requires less thinking when you have 10 failed tests and try to understand what is the reason they all started failing.

> Admittedly the previous example is a bit simplistic, you would probably do just fine without the additional reason, but it just reads soo well! 🙂

## Reasons force you think more

One reason to use `-Because` is to force yourself to think before writing any code. Writing tests before writing code is a great way of forcing yourself to think about the problem. Using `-Because` forces you even a bit more, because you have to form a sentence that describes what you are trying to do. When you have problems forming that sentence you are probably not sure what you are doing, so go back to the problem and revisit it.

## Reasons document your intent

Making your test code obvious is an important part of testing. You write the test code once, and then get back to it every time the test fails. The less thinking the code requires the better.

```powershell
Describe 'Get-User' {
    Context 'Validate user object' {
        # function is here only to make the example work
        function Get-User {}

        It 'retrieved user has name' {
            $user = Get-User -Name 'Jakub'
            $user | Should -Not -BeNullOrEmpty `
                           -Because 'having a user is a pre-condition for our test'

            $user.Name | Should -Be 'Jakub'
        }
    }
}
```

In this example I am validating that an object is populated correctly, but to be able to validate it I first need to have it. So I better check that I have an object _before_ doing the actual test. Adding the reason tells the guy who inherits my test base that the first assertion is a guard assertion. This again requires less guessing about what the code does.

It also makes the build server failure obvious by telling that the test failed, because we did the setup incorrectly, not because our functionality is broken.

```text
Describing Get-User
  Context Validate user object
    [-] retrieved user has name 106ms
      Expected a value, because having a user is a pre-condition for our test, but got $null or empty.
```

## Reasons make your TestCases clearer

Using `-TestsCases` it is really simple to reuse the same test to test many different inputs, unfortunately this often makes it much harder to determine what we are testing as we need to mentally parse a big array of examples in our head. Adding a reason to each of the test cases tells us why we are testing that particular case, and makes it much easier to review the capabilities of our function.

```powershell
Describe 'Test-Anagram' {
    # function is here only to make the example work
    function Test-Anagram ($Original, $Anagram) { $false }

    It "Given '<Original>'' and '<Anagram>' it returns `$true" -TestCases @(
        @{  Original = 'abcd'
            Anagram  = 'abdc' 
            Because  = "just the last two letters are switched" }

        @{  Original = 'hello'
            Anagram  = 'olleh' 
            Because  = "it's the same word backwards" }
    ) {
        param($Original, $Anagram, $Because)

        Test-Anagram $Original $Anagram | 
            Should -Be $true -Because $Because
    }
}

# outputs

# Describing Test-Anagram
#  [-] Given 'abcd'' and 'abdc' it returns $true 84ms
#     Expected {True}, because just the last two letters are switched, but got {False}.

#  [-] Given 'hello'' and 'olleh' it returns $true 127ms
#     Expected {True}, because it's the same word backwards, but got {False}.
```

## Summary

Use `-Because` to make your tests easier to understand at a glance, and to document your intent so nobody has to guess what you meant.