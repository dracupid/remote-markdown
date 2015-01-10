Remote markdown
=========================

View a online markdown file by url or github repo name prettily.

- Markdown to HTML (by [marked](https://github.com/chjj/marked))
- Syntax highlight. (by [highlight.js](https://github.com/isagalaev/highlight.js))
- Better markdown syntax support, and pretty style. Don't bother to download the markdown file manually.
- Table of contents (todo)
- Smart enough to find the `readme.md` or `README.md` or `Readme.md` by a repo name.
- Automanticlly replace the url in the markdown file.

## Install
```bash
npm i remote-markdown -g
```

##Usage

```bash
Usage: remote-md [url] [options]

  Options:

    -h, --help           output usage information
    -V, --version        output the version number
    -s, --style <style>  Hightlight.js style class name, default is rainbow.
    -p, --port <port>    Port of the server, default is 8080.
```

For example
```bash
remote-md dracupid/npm-up
```
As you can see, your default browser is opened at `127.0.0.1:8080/dracupid/npm-up`(assume that the port is default one), and the markdown file is prettily shown. From now on, you can just change the URL to view other markdown files, such as
```
127.0.0.1:8080/https://raw.githubusercontent.com/dracupid/npm-up/master/readme.md
127.0.0.1:8000/ysmood/nobone
```

Of course, you can use an url directly, especially the markdown file is not a github readme
```bash
remote-md https://raw.githubusercontent.com/dracupid/npm-up/master/readme.md
```


## License
MIT