#!/usr/bin/env node
var version = require('./package.json').version;

var cmder = require('commander');

cmder
  .usage("[url or repo] [options]")
  .version(version)
  .option('-s, --style <style>', "Hightlight.js style class name, default is rainbow.")
  .option('-p, --port <port>', "Port of the server, default is 8080.");


cmder.parse(process.argv);

var kit = require('nokit'),
	http = require('http'),
	md = require('marked'),
	hl = require('highlight.js'),
	toc = require('marked-toc'),
	slugify = require('uslug'),
	pwd = __dirname;



var style = kit.fs.readFileSync(kit.path.join(pwd, 'markdown.css')),
	theme = cmder.style || 'rainbow',
	port = cmder.port || 8080,
	cache = {},
	filterRe = /\.png|\.jpg|\.jpeg|\.gif|\.ico$/,
	readme = kit.fs.readFileSync(kit.path.join(pwd, 'readme.md')) + '';


md.setOptions({
	highlight: function (code, lang) {
		(lang == 'shell') && (lang = 'bash');

		hled = code
		try {
			hled = hl.highlight(lang, code).value;
		} catch(e) {}

		return hled
  }
});
var renderer = new md.Renderer();

renderer.heading = function (text, level, rawText) {
	var id = slugify(rawText, { allowedChars: '-' });

	return '<h' + level + ' id="' + id + '">' + text + '</h' + level + '>';
}

var markdown = function(str){
	var data = '<div id="toc">' + md(toc(str, {slugifyOptions: { allowedChars: '-' }}), {renderer: renderer}) + '</div>';
	data += '<div id="md">' + md(str, {renderer: renderer}) + '</div>'
	return data;
}

style += kit.fs.readFileSync(kit.path.join(pwd, 'node_modules/highlight.js/styles/') + theme + '.css');
readme = '<style>' + style + '</style>' + markdown(readme);


formatData = function(md, url, isRepo){
	var data = '';
	md = md.replace(/!?\[[^\[\]]*\]\(([^\[\]]*)\)/g, function(match, p1){
		if(p1.indexOf('://') !== -1 || p1.indexOf('//') === 0 || p1.indexOf('#') === 0){
			return match;
		}
		else{
			var dir = url.split('/');
			dir.pop();
			return match.replace(p1, dir.join('/') + '/' + p1);
		}
	});
	md = md.replace(/href\s*=\s*['"]([^'"]*)["']/g, function(match, p1){
		if(p1.indexOf('://') !== -1 || p1.indexOf('//') === 0 || p1.indexOf('#') === 0){
			return match;
		}
		else{
			if(isRepo){
				return match.replace(p1, 'https://github.com/' + url + '/blob/master/' + p1);
			}
			else {
				var dir = url.split('/');
				dir.pop();
				return match.replace(p1, dir.join('/') + '/' + p1);
			}
		}

	});
	data += '<style>' + style + '</style>';
	data += markdown(md);
	cache[url.toLowerCase()] = data;

	return data;
}

var getGithubReadmeP = function(repo){
	var url = ('https://api.github.com/repos/' + repo + '/readme').green
	kit.log("Fetching: " + url);
	var req = kit.request(url);
	req.req.setTimeout(15000, function(e){
        return kit.Promise.reject("Timeout");
    });

	req.then(function(data){
		if(!data){
			return '';
		}
		console.log(data.content);
		return new Buffer(data.content).toString(data.encoding);
	});

	return req;
}

var fetchP = function(url){
    return kit.request(remoteUrl).then(function(md){
		return md;
	});
}

var getMarkdownP = function(isRepo, url){
	if(isRepo){
		return getGithubReadmeP(url);
	}
	else {
		return getReadmeP(url);
	}
}


http.createServer(function(req, res){
	var remoteUrl = req.url.slice(1), repo = false;

	res.writeHead(200, {'Content-type' : 'text/html'});
	res.write('<meta charset=utf8>')
	res.write('<title>Remote Markdown</title>')

	if(!remoteUrl){
		kit.log("Show Readme");
		res.end(readme);
		return;
	}

	if(filterRe.test(remoteUrl)){
		res.statusCode = 404;
		res.end();
		return;
	}

	if(!/^http/.test(remoteUrl) && !/.md|.markdown^/i.test(remoteUrl)){
		isRepo = true;
	}

	kit.log("Render " + remoteUrl.green);

	if(cache[remoteUrl]){
		kit.log("Done (from cache)".cyan);
		res.end(cache[remoteUrl]);
	}
	else {
		getMarkdownP(isRepo, remoteUrl).then(function(md){
			if(!md || md === 'Not Found'){
				kit.log("Not Found".red);
				return res.end("Can not find markdown file");
			}
			res.end(formatData(md, url, isRepo));
		}, function(err){
			kit.err(err.toString().red);
			res.end(err.toString());
		})
	}
}).listen(port);


kit.log('Create Server at 127.0.0.1:' + (port + '').green)

var url = cmder.args[0] || ''
if(url[0] === '-'){
	url = '';
}

kit.open('http://127.0.0.1:' + port + '/' + url);
