---
title: 7 years of Pester
date: 2018-01-01 12:36:53
type: external link
tags: 
 - powershell
 - pester
 - testing
categories:
  - talk
---

Seven years ago, on the first day of 2011 the [first commit](https://github.com/pester/Pester/commit/a1d6a0e01f58375175ed090647ab8245a049f1a6) to Pester repository was done by [Scott Muc](https://twitter.com/ScottMuc). Little did he know that this minimal implementation of a testing framework, he committed still a bit drunk from the previous evening, will grow into the number one PowerShell testing framework it is today.

<!-- more -->

At that time the implementation was extremely simple and used fluent syntax for the assertions. Here is the first of the original examples that came with the first commit:

```powershell
$pwd = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$pwd\Add-Numbers.ps1"
. "$pwd\..\..\Source\Pester.ps1"

Describe "Add-Numbers" {

    It "adds positive numbers" {
        $sum = Add-Numbers 2 3
        $sum.should.be(4)
    }
}
```

I encourage you to check out that commit, to see how little code is needed to actually implement a working testing framework. One of the things you might notice is that the first commit does not use exceptions to indicate fail of a test. Instead a boolean condition is used. This was later amended, to prevent any test failure from stopping the whole test run.

## Flying under the radar

In next few years, Pester did not get much traction, in the first year Scott developed it alone mostly, with occasional help from others. The idea of testing in PowerShell was probably too revolutionary at that time and not many people seen any use in it. Lucking in 2012 [Matt Wrock](https://twitter.com/mwrockx) joined the project and added [Mocking](https://github.com/pester/Pester/wiki/Mock) to Pester. Most of the code is still present in the codebase.

```text
Commits:

2011
   33 Scott Muc
    6 Martin Aatmaa
    4 manojlds
2012
   56 Matt Wrock
   21 Scott Muc
    7 Max Bergmann
2013
   61 Scott Muc
   14 Matt Wrock
    4 Arun Mahapatra
```

## Getting on board

That brings us to year 2014 (or rather end of 2013), when I found myself in need of a testing framework. At that time I barely knew anything about testing and only had a feeling that a testing framework would help me make my code less brittle. Multiple frameworks were available at that time, but Pester felt to be the most feature-complete of them. So I started using it, and it in fact helped me to finish the project successfully.

Full of enthusiasm for this newly found skill that everyone one else seemed to be missing on, I started talking about Pester to anyone who was willing to listen, and wrote my [first article about Pester](http://www.powershellmagazine.com/2014/03/12/get-started-with-pester-powershell-unit-testing-framework/). 

I also improved few features, and so on, but at that time it seemed that I am the only person interested in testing. Soon I also inherited the project from Scott who was not doing development on Windows anymore, and so he had little interest in maintaining the project.

```text
Commits:

2014
  180 Dave Wyatt
  100 nohwnd
   25 Joel Bennett
```

Hopefully writing about Pester helped stir some interest and soon after [Dave Wyatt](https://twitter.com/msh_dave) joined the project. He started started cleaning the codebase, piling in features, and for the years to come he became the top committer to the project.

## Getting popular

Year 2015 marks a very important mark for both Pester and Windows. Pester was selected to be shipped with Windows 10 and was the first open source software to ever be shipped as part of Windows. See the [announcement here](https://youtu.be/aem257PCO9c?t=17m27s).

Still it wasn't till 2016 when the project started to get a bit more traction in the community. Many articles were published and everyone was talking about testing. See the listing [of Pester related articles](https://github.com/pester/Pester/wiki/Articles-and-other-resources).

For me the years 2015 and 2016 marked an important change in my life. I changed careers, and became a developer, unfortunately at the price of neglecting Pester. On the other hand, being a developer gave me way more practice in testing, because I now do it everyday.

```text
Commits:

2015
  210 Dave Wyatt
   38 Joel Bennett
   16 nohwnd
2016
   93 Dave Wyatt
   21 nohwnd
   13 June Blender
```

## Last year

The year 2017 was awesome for Pester. We finally released version 4. Which also includes Gherkin that [Joel Bennet](https://twitter.com/Jaykul) added. Got new core members: [Wojciech Sciesinski](https://twitter.com/itpraktyk), who made Pester work on PSCore. [Alx9r](https://twitter.com/alx9r) who is extremely knowledgeable about PowerShell edge cases. 

Some people even went as far as saying that Pester [totally changed their life](https://twitter.com/cl/status/931130461111422977) and that it was [the most important thing they learned that year](https://twitter.com/FredBainbridge/status/942968510095003649)!

For me the biggest win is that I got back to actively working on Pester, and that I started blogging again.

```text
Commits:

2017
   97 nohwnd
   35 Wojciech Sciesinski
   23 Joel Bennett
```

## Future

Let's see what the year 2018 brings! 🍾🍾🍾
