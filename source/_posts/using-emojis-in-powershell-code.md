---
title: Using emojis in PowerShell code
tags: 
 - powershell
 - fun
 - emoji
categories:
 - article
date: 2017-12-09 00:24:08
---


Few days ago I saw a post about using hieroglyph unicode characters in Haskell to write fully functional haskell code. They shown an example of `map` function. A function that applies a function to a collection of items. Pretty much how `foreach` does in PowerShell.

I thought this was fun, and tweeted this:

{% asset_img orig.jpeg "Original tweet" %}

That code uses capabilities of PowerShell that has been there since I started using it. We can use the smiley face as the function name because it is a valid unicode character and is not a restricted character. And then we can use it the same emoji again as the parameter to the function. All we need to do is wrap the variable name in `${}`. This sequence of characters is recognized by PowerShell as an escape sequence and allows us to define the variable name as any sequence of unicode characters, except for the closing curly brace. This is mainly meant for interoperability with code that does not follow PowerShell rules, but why not use it to have a bit of fun.

Another example of emojis in code is this hello world example:

{% asset_img helloworld.jpeg "Hello world" %}

This is still fairly recognizable as PowerShell code, we are just using special characters for that function name. This was not enough for me and I wanted to get closer to coding purely in emojis, like [emojicode](http://www.emojicode.org/) does it.

So I came up with this:

{% asset_img poopcompiler.jpeg "Poopcompiler" %}

This is totally valid PowerShell code that defines four functions, and then uses them. 

## Here is how it works

> _Note: I had some trouble rendering the 1️⃣ 2️⃣ glyphs in code, so I will be using 🍺 🍻 instead of them in the rest of the article. Beer is more awesome than keycaps anyway._

We use 🐙 to define a function, as if we used the `function` keyword. After that we define the name of the function, followed by function parameters. We don't know how many parameters there will be so we need to separate them from the function body. To do that we use the most famous emoji, the pile of poo 💩.

The first function is named 🥓 (bacon) and returns bacon as a string. We use 🔤 to denote the start and end of a string. Here is the whole function definition:

```powershell
🐙 🥓 💩 🔤🥓🔤
```

The next two functions are building on the same idea, but we are defining 🍺 to mean `1` and 🍻 to mean `2`.

```powershell
🐙 🍺 💩 1
🐙 🍻 💩 2
```

The last function definition ➕ (add) is more interesting, we define two parameters 🅰 and 🅱, we then add those two parameters together.

```powershell
🐙 ➕ 🅰 🅱 💩 🅰+🅱
```

And we can use it like this:

```powershell
➕ 🥓 🥓  # returns 🥓🥓
➕ 🍺 🍻  # returns 3
➕ 1 4    # returns 5
```

## How does that work?

In essence we are not doing anything particularly difficult. Translating the code above into normal PowerShell code it would look like this:

```powershell
function bacon { 'bacon' }
function oneBeer { 1 }
function twoBeers { 2 }

function add ($a, $b) { $a + $b }

add (bacon) (bacon)
add (oneBeer) (twoBeers)
add 1 4
```

There are just few problems that we need to solve:

- make 🐙 generate valid PowerShell function
- make 🐙 define that function

- get rid of the parentheses when calling functions

## Generating a function

A proper PowerShell function consists of four things. The `function` keyword, the name of that function, parameters block, and function body. Schematically it looks like this:

```powershell
function <name> {
    param(<param1>, <param2>)
    <body>
}
```

The simplest function to generate is the 🍺 function. It simply returns the number `1` when called. All we need to do is split the list of emojis to two groups based on where the 💩 separator is.

```powershell
$separator = '💩'
$name,$params = $args.Where({$_ -eq $separator},'Until')
$null,$groups = $args.Where({$_ -eq $separator},'SkipUntil')
```

The first item from the first group is the function name. All the following items are the parameters, in this case we don't have any. All the items in the second group go into the function body. Luckily there are no special characters to be translated, so we don't have to deal with that just yet.

Our function generator would then look like this:

```powershell
function 🐙 {
    $separator = '💩'
    $name,$params = $args.Where({$_ -eq $separator},'Until')
    $null,$groups = $args.Where({$_ -eq $separator},'SkipUntil')

    "function $name { $groups }"
}

# calling this
🐙 🍺 💩 1
# generates
function 🍺 { 1 }
```

## Defining a function

Our generator generated a function body as string, and now we need to define that function. In PowerShell there is a reserved keyword `function` that we use to define functions. Using this keyword we can define function within the current scope. Unfortunately this is not what we need. Our 🐙 must be able to define a function outside of itself. Luckily you can define a function as a global function, to make it available in all scopes. We already have our function as a string so the best way to proceed is adding `gloabal:` before the function name, and invoking it via `Invoke-Expression`. Like this:

```powershell
Invoke-Expression "function global:🍺 { 1 }"
```

> Not being able to define functions in any scope we want is a bit that is surprisingly missing from PowerShell when you realize that Set-Variable -Scope 1 allows us to do just that. In this case we don't mind defining functions as global, because this whole thing is a silly example. But if you really need to define function in the parent scope of your function, you can look at my [Mock module prototype](https://github.com/nohwnd/Mock) that uses the same trick as `Invoke-Expression` uses to run code outside of itself. That allows the `New-Mock` function define functions that live in the parent scope.

## Get rid of the parentheses

We defined 🍺 as a function that returns the number `1`. Using it in function call without parentheses would pass on the literal value 🍺, instead of calling the function and passing on the number `1`. This is a bit of a problem for us, but luckily we know that all functions are accessible via `Get-Command`. All we need to do is check if 🍺 is a defined function and call it inside of our generated function.

```powershell
function f ($value) {
    $value
}

function g ($valueOrFunction) {
    if (Get-Command $valueOrFunction -ErrorAction SilentlyContinue) {
        &(Get-Command $valueOrFunction)
    }
    else
    {
        $valueOrFunction
    }
}

function 🍺 () { 1 }

f  3   # outputs 3
f  🍺  # outputs 🍺 <- and that's not what we want
f (🍺) # outputs 1

g  3  # outputs -> 3
g 🍺 # 🍺 evalueates function 🍺 and outputs 1
```

And that is it. A cleaned up version of the whole compiler function then looks like this:

```powershell
# split to whole unicode characters, cannot use ToCharArray,
# because some of tha unicode characters occupy two "char" positions
function Split-ToUnicodeCharacters ($String) {
    $enumerator = [Globalization.StringInfo]::GetTextElementEnumerator($String)
    while ($enumerator.MoveNext())
    {
        $enumerator.Current
    }
}

# for every character decide what to do, either translate it to
# something else or keep it as it is
# 🔤 starts and stops mode when every character is output as-is
function Translate-Characters ($characters) {
    $literalMode = $false
    foreach ($character in $characters) {
        if ($character -eq "🔤")
        {
            # switch between translating characters
            # and outputting them as-is
            $literalMode = -not $literalMode
            "'"
            continue
        }

        if ($literalMode) {
            $character
            continue
        }

        # if the current character is one of the parameters
        # we need to treat it likea variable, so we generate
        # the ${} escape sequence around it
        if ($character -in $params) {
            # define randomly named variable so we can store
            # the result of command lookup
            # (in production you should never shorten GUID)
            $randomVariableName = [Guid]::NewGuid() `
                .ToString('N').Substring(0,5)
            # generate immediately invoked scriptblock around the if
            # because otherwise the code would not parse
            #
            # then inspect the value inside the parameter, if it is a defined function then invoke it
            # otherwise just return the value
            "(&{
                if (`$$randomVariableName = (Get-Command `${$character} -ErrorAction SilentlyContinue))
                {
                    &`$$randomVariableName
                } else {
                    `${$character}
                }
            })"
            continue
        }

        # the character is not param, then look it up in defined functions,
        # if it exists execute it, otherwise just output it as character
        if (Get-Command $character -ErrorAction SilentlyContinue) {
            "(&(Get-Command $character))"
            continue
        }

        $character
    }
}

function 🐙 {
    # split on the splitter, to get name, params and body
    $separator = '💩'
    $name,$params = $args.Where({$_ -eq $separator},'Until')
    $null,$groups = $args.Where({$_ -eq $separator},'SkipUntil')

    $body = @()
    # process each character group in the body, and translate it into 
    # PowerShell code
    foreach ($characterGroup in $groups)  {
        $characters = Split-ToUnicodeCharacters $characterGroup
        $body += Translate-Characters $characters
    }

    # generate paraters with the escape sequence
    $paramsText = ($params | where {$_} | foreach {"`${$_}"}) -join','
    $bodyText = $body -join ''
    $functionDefinition = @"
        param($paramsText)
        $bodyText
"@
    # put it all together
    $wholeFunction = "function global:$name {$functionDefinition}"

    # define the function
    Invoke-Expression $wholeFunction
}


# 🐙 # -> defines a function
# 💩 # -> splits function parameters and function body

# define bacon function as string bacon
🐙 🥓 💩 🔤🥓🔤

# define oneBeer emoji as 1
🐙 🍺 💩 1

# define twoBeers emoji as 2
🐙 🍻 💩 2

# define plus emoji function that takes
# parameters a and b and adds them together
🐙 ➕ 🅰 🅱 💩 🅰+🅱

# add bacon to bacon
➕ 🥓 🥓

# add 1 and 2 using emojis
➕ 🍺 🍻

# add numbers 1 and 4
➕ 1 4

'bacon definition'
get-command 🥓 | % definition

'plus definition'
get-command ➕ | % definition

➕ 🥓 🥓
➕ 🍺 🍻
➕ 1 4
```

## Summary

I had a lot of fun with this. More of us did, actually. [Matthias](https://twitter.com/IISResetMe) wrote his own version, from which I used some bits for this article, see [his version](https://gist.github.com/IISResetMe/cba955fc01b84fff4396dada77e36102). You can also find the twitter threads [here](https://twitter.com/nohwnd/status/937978006659878912) and [here](https://twitter.com/nohwnd/status/938126535189463040).