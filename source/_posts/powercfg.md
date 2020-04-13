---
title: Powercfg.exe tips & tricks
date: 2018-11-08 18:00
tags: 
 - windows
 - power management
categories:
 - article
---

Yesterday I had to write a script to do some initial setup on Windows and one of the steps was configuring power settings. I remembered that there were few useful options, but googling them did not help me. Luckily I found the pieces in an old script I wrote. So here are few tips for using `powercfg.exe`


<!-- more -->


## Use Guid aliases

In many online resources you find commands like these:

```batch
powercfg.exe -SETACVALUEINDEX `
    '381b4222-f694-41f0-9685-ff5bb260df2e' `
    '238c9fa8-0aad-41ed-83f4-97be242c8f20' `
    '29f6c1db-86da-48c5-9fdb-f2b67b1f44da' `
    3600
```

Using Guids is great for compatibility, but awful for readability. So if you are on Windows 7 or newer use aliases instead. You can list all the aliases by `powercfg.exe -aliases` which is missing from the help for some reason.

```shell
a1841308-3541-4fab-bc81-f71556f20b4a  SCHEME_MAX
8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  SCHEME_MIN
381b4222-f694-41f0-9685-ff5bb260df2e  SCHEME_BALANCED
e73a048d-bf27-4f12-9731-8b2076e8891f  SUB_BATTERY
637ea02f-bbcb-4015-8e2c-a1c7b9c0b546    BATACTIONCRIT
d8742dcb-3e6a-4b3c-b3fe-374623cdcf06    BATACTIONLOW
5dbb7c9f-38e9-40d2-9749-4f8a0e9f640f    BATFLAGSCRIT
...
```

It gives you are very nice hierarchical table, but it's a bit difficult to guess what exactly the alias means. A better way to lookup the information is by `powercfg.exe -query`, especially if you reduce the output to only show the alias and the line before it: 

```powershell
powercfg.exe -query | Select-String 'GUID Alias' -context 1,0

## output
#   Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)
# >   GUID Alias: SCHEME_BALANCED
#     Subgroup GUID: 0012ee47-9041-4b5d-9b77-535fba8b1442  (Hard disk)
# >     GUID Alias: SUB_DISK
#       Power Setting GUID: 6738e2c4-e8a5-4a42-b16a-e040e769756e  (Turn off hard disk after)
# >       GUID Alias: DISKIDLE
#     Subgroup GUID: 238c9fa8-0aad-41ed-83f4-97be242c8f20  (Sleep)
# >     GUID Alias: SUB_SLEEP
# ...
```

Inspecting the full output we can easily figure out that the command above translates to:

```POWERSHELL
powercfg.exe -SETACVALUEINDEX SCHEME_BALANCED SUB_SLEEP STANDBYIDLE 3600
```

Which is a valid `powercfg.exe` command and can easily be understood as "On Balanced scheme, when connected to electric outlet, sleep after 1 hour of idleness.".


## Use schema aliases

In the previous command we used `SCHEME_BALANCED` to change built-in Balanced scheme. And there are also `SCHEME_MIN` for the Maximum performance, and `SCHEME_MAX` for Power saver scheme. The alias names are a bit backwards, because MIN stands for minimum power saved -> Maximum performance, and vice versa for MAX.

The three aliases above are easy to discover, because they are listed on the top of the `-alaises` table, but there are two more that are extremely useful: 

`SCHEME_ALL` pointing to all schemes. This one saves you ton of work when you try to make some settings consistent over all available schemes.

`SCHEME_CURRENT` pointing to the currently active scheme. This one is extremely useful when applying changes that require re-activation of the scheme. In that case you can simply do `powercfg.exe -setactive SCHEME_CURRENT`. It looks like non-sense, but without it some of the settings won't work.

These two aliases you can discover by using `-aliasesh` parameter which lists all aliases, including aliases for hidden settings.

## Inspect hidden settings

The tool can change way more then it seems. There is probably a good reason to hide most of the options by default, but listing them could be more obvious. Listing all the settings can be done by using an undocumented `-qh` switch (no `-queryh` does not work), which on my system yields 137 options vs. 31 options for the normal query.

```powershell
powercfg.exe -qh | 
    Select-String "Power Setting Guid" | 
    Measure-Object | Select -Expand Count

powercfg.exe -query |
    Select-String "Power Setting Guid" |
    Measure-Object | Select -Expand Count
```

Most of the settings you should not fiddle with, but for example setting the time to turn off display on lock screen from the default 1 minute to 10 seconds can be done like this:

```powershell
powercfg.exe -setacvalueindex SCHEME_CURRENT SUB_VIDEO VIDEOCONLOCK 10

# this won't work without activating the currently active scheme
# (weird I know)
powercfg.exe -setactive SCHEME_CURRENT
```

Making the settings visible is possible via `-attributes`, but the settings apply even when hidden so I am not sure why you would need to do it:

```powershell
# show hidden setting 
 powercfg.exe -attributes SUB_VIDEO VIDEOCONLOCK -ATTRIB_HIDE

# hide setting
 powercfg.exe -attributes SUB_VIDEO VIDEOCONLOCK +ATTRIB_HIDE
```

## Reset to default

It is always a good idea to make backup when fiddling with important system settings, but if you didn't and now you want to revert all your changes, simply call `powercfg.exe -restoredefaultschemes` to put everything to it's initial state.
