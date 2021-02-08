# WhatIs_robots.txt?


## What is a web crawler bot?
A web crawler, spider, or search engine bot downloads and indexes content from all over the Internet. The goal of such a bot is to learn what (almost) every webpage on the web is about, so that the information can be retrieved when it's needed. They're called "web crawlers" because crawling is the technical term for automatically accessing a website and obtaining data via a software program.

These bots are almost always operated by search engines. By applying a search algorithm to the data collected by web crawlers, search engines can provide relevant links in response to user search queries, generating the list of webpages that show up after a user types a search into Google or Bing (or another search engine).

A web crawler bot is like someone who goes through all the books in a disorganized library and puts together a card catalog so that anyone who visits the library can quickly and easily find the information they need. To help categorize and sort the library's books by topic, the organizer will read the title, summary, and some of the internal text of each book to figure out what it's about.

Web scanners also decide which pages to scan based on the `robots.txt` protocol (also known as the robot exclusion protocol). Before crawling a web page, they will check the robots.txt file located on that page's web server. A `robots.txt` file is a text file that contains rules for any bots accessing a hosted website or application. These rules determine which pages bots can crawl and which links they can click.

`Robots.txt` is created using standard syntax, and its directives understood by robots of all search engines. If you do not use this file, all pages of your site will be scanned indiscriminately. This can have a negative impact on search engine results.

There are two important considerations when using `/robots.txt`:

1. Robots can ignore your `/robots.txt`. Especially malware robots that scan the web for security vulnerabilities, and email address harvesters used by spammers will pay no attention.
2. The `/robots.txt` file is a publicly available file. Anyone can see what sections of your server you don't want robots to use. Try to open https://www.facebook.com/robots.txt to make it sure.

## The main purposes `of robots.txt`.

The main purpose of robots is to contain rules that help bots correctly index a resource. The main directives are _Allow_ (permission to index a section or a specific file), _Disallow_ (a reverse command, i.e., a ban on such a procedure) and _User-agent_ (addressing Allow and Disallow commands, i.e., determining which bots should follow them).

## Possible directives

Robots.txt syntax can be thought of as the “language” of robots.txt files. There are five common terms you’re likely come across in robots.txt file. They include:

**Allow**:
 
 (Only applicable for Googlebot): The command to tell Googlebot it can access a page or subfolder even though its parent page or subfolder may be disallowed.
 
**Disallow**:
 
 The command used to tell a user-agent not to crawl particular URL. Only one "Disallow:" line is allowed for each URL.

**User-agent**: 

The specific web crawler to which you’re giving crawl instructions (usually a search engine). A list of most user agents can be found here.

**Crawl-delay**:

If the search engine robots are overloading the server, this directive will help. It contains information on the minimum interval between the end of loading one page and the next. This time interval is specified in seconds. Moreover, the Yandex bot easily reads not only whole numbers, but also fractional values, such as 0.7 seconds. But Google search robots do not yet take Crawl-delay directive into account.

**Sitemap**:

Used to call out the location of any XML sitemap(s) associated with this URL. Note this command is only supported by Google, Ask, Bing, and Yahoo. To ensure that sites indexed correctly and quickly, you create a Sitemap - a file (or several) with a map of the resource. The appropriate directive is written anywhere in the "robots" file and taken into account by search bots, regardless of location. However, as a rule, it is placed at the end of the document. By processing the directive, the bot remembers the information and reprocesses it. It is this data becomes the basis for subsequent sessions in which pages are loaded for indexing the web resource.

**Host**:

Bots of all search engines are guided by this directive, which allows you to write a mirror web resource, which when indexed will be perceived as the main. Thus you can avoid the inclusion in the index multiple mirrors, ie duplicate site in search engine results. If the Host values are several, the robot performing indexing, takes into account only the first, and all the rest are ignored.


### Basic Format:
```
User-agent: [user-agent name]
Disallow: [URL string not to be crawled]
```
Together, these two lines are considered a `complete robots.txt` file — though one robots file can contain multiple lines of user agents and directives (i.e., disallows, allows, crawl-delays, etc.).  
Within `a robots.txt` file, each set of user-agent directives appear as a discrete set, separated by a line break.

```
User-agent: agentA
Disallow: /hello/

User-agent: AgentB
Disallow: /
```

Note that each directive has a special symbol * at the end by default. Its purpose is to extend the zone of the rule to the entire site, that is, to all its pages or sections whose names begin with a certain combination of characters. 
 * `*` in the User-agent field is a special value meaning "any robot". Specifically, you cannot have lines like "User-agent: *bot*", "Disallow: /tmp/*" or "Disallow: *.gif".
 
 *`$` symbol is used to cancel the operation, which is performed by default. According to the standard of "robots" formation, it is recommended that after each set of User-agent instructions a blank line with a translation. 
 
* `#` symbol is used for commenting. Information placed after it and before the empty translation is not taken into account by search bots.

## Examples 
What you want to exclude depends on your server. Everything not explicitly disallowed is considered fair game to retrieve. Here follow some examples:

**To exclude all robots from the entire server**
```
User-agent: *
Disallow: /
```
**To allow all robots complete access**
```
User-agent: *
Disallow:
```

**To exclude all robots from part of the server**
```User-agent: *
Disallow: /cgi-bin/
Disallow: /tmp/
Disallow: /junk/
```

**To exclude a single robot**
```User-agent: BadBot
Disallow: /
```

**To allow a single robot**
```User-agent: Google
Disallow:

User-agent: *
Disallow: /
```

## Reference
1. [Developers Google: tobots.txt](https://developers.google.com/search/docs/advanced/robots/intro)
2. [Let A Thousand Spiders Crawl](https://knuckleheads.club/let-a-thousand-spiders-crawl/)
3. [NY times: how-google-dominates](https://www.nytimes.com/2020/12/14/technology/how-google-dominates.html)
4. [What is web crawler](https://www.cloudflare.com/learning/bots/what-is-a-web-crawler/)