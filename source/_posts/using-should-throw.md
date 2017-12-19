---
title: Pester - Using Should -Throw
date: 2017-12-19 18:19:44
tags:
---

This weekend I added type filter and `-PassThru` to `Should -Throw`. Let's see how are they useful.

> 🔥 This feature is not released yet, get pre-release [version 4.2.0-alpha3](https://www.powershellgallery.com/packages/Pester/4.2.0-alpha3) to use it.

## Type filter

Filtering exceptions on type is one of the most basic capabilities of any assertion that deals with exceptions, yet we were missing it till now. But there it is now:

```powershell
Describe "Get-Computer" {
    # function is here only to make the example work
    function Get-Computer { throw [NotImplementedException]'' }

    It 'throws argument exception when given $null' {
        { Get-Computer `$null } |
            Should -Throw -ExceptionType ([ArgumentException])
    }
}

# outputs
# Describing Get-Computer
#   [-] throws argument exception when given $null 35ms
#     Expected an exception, with type {System.ArgumentException}
#     to be thrown, but the exception type was
#     '{System.NotImplementedException}'.
```

The type filter matches the exception type and any of it's subtypes. This means that throwing `ArgumentException` or `ArgumentNullException` would make the previous test pass. This might be surprising to you, but catching the least specific exception from the same family makes your tests less brittle, and hence easier to change.

## Better error messages

The error messages got better, because now you see which filters were not matched, instead of all the filters that you applied, like this:

```powershell
Describe "Get-Computer" {
    # function is here only to make the example work
    function Get-Computer {
        throw [ArgumentNullException]'Value was null.' }

    It 'throws argument exception when given $null' {
        { Get-Computer `$null } |
            Should -Throw `
                -ExceptionType ([ArgumentException]) `
                -ErrorId 'SpecificErrorId'
    }
}

# outputs
# Describing Get-Computer
#   [-] throws argument exception when given $null 76ms
#     Expected an exception, with type {System.ArgumentException},
#     with FullyQualifiedErrorId 'SpecificErrorId' to be thrown,
#     but the FullyQualifiedErrorId was 'Value cannot be null.
```

## Should -Not -Throw changed behavior

`Should -Not -Throw` the ugly sister of `Should -Throw`, was swallowing errors when a filter was defined and the thrown exception was not met. This did not make sense, the premise of `Should -Not -Throw` is that an exception was *not* thrown. So when any exception is thrown the assertion should fail, no matter what filter you specify. The recommended practice is simply not using it, because every line is an implicit should not throw.

## PassThru
There is a new parameter for that allows you to pass the caught error object so you can examine it further. This is useful when you are interested in the inner exception, or when you catch an aggregate exception and need to extract some info from it.

```powershell
$sb = { throw (New-Object Exception -ArgumentList "ex1",
                (New-Object Exception -ArgumentList "inner1",
                    (New-Object Exception -ArgumentList "inner2"))) }


$err = $sb | Should -Throw -PassThru
$err.Exception.InnerException.InnerException.Message |
    Should -Be "File not found."

# outputs
# Expected strings to be the same, but they were different.
# Expected length: 15
# Actual length:   6
# Strings differ at index 0.
# Expected: {File not found.}
# But was:  {inner2}
# -----------^
```

Here we are interested in the message of the inner-inner exception. So we capture the object, and then use `Should -Be` to further examine it.

## Summary

`Should -Throw` got better, so try to use it and help the project by reporting how it works on twitter, powershell slack or our repo. Also checkout other cool features, like `-Because` or `-HaveCount`. For full listing see the [our changelog](https://github.com/pester/Pester/blob/master/CHANGELOG.md).