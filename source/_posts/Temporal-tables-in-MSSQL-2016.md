---
title: Temporal tables in MSSQL 2016
tags: 
 - sql
 - entityframework
date: 2016-03-27 15:35:12
categories:
 - article
---

The new version of MS SQL server offers a lot of new cool features. One of them is called system-versioned temporal tables. 

As the name suggests, this feature enables versioning for data in table, it does quite simply by creating a second table that holds the historic state of each row, as well as information about the timespan in which the row was valid. 

For more information see [this great overview on MSDN](https://msdn.microsoft.com/en-us/library/dn935015.aspx). 

The sad truth is that there is no support for versioned tables in EF 6, and no sings of it being prepared. For EF Core, there is at least an [issue marked as enhancement](https://github.com/aspnet/EntityFramework/issues/4693) so hopefully someone will jump on it and sooner or later we will be able to do: `_context.Orders.AsOf(1.Months().Ago().LastDayOfMonth())`.

The good thing is that, even though you can't access the historic data through EF yet, you can use the versioning on the tables where EF stores your entities. This should be useful in systems where audits are not reviewed often, and so you can afford to query them through ad-hoc SQL, but still need to have the auditing in place. 

Here is a [great article](http://www.pontop.dk/#!SQL-Server-2016-temporal-tables-7-Database-first-Entity-Framework-models-and-systemversioned-tables/whpr3/56732b230cf275ddd6e971a5) on how to use versioning with EF.



  