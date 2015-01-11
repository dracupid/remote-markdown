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
	pwd = __dirname;



var style = kit.fs.readFileSync(kit.path.join(pwd, 'markdown.css')),
	theme = cmder.style || 'rainbow',
	port = cmder.port || 8080,
	cache = {},
	filterRe = /\.png|\.jpg|\.jpeg|\.gif|\.js|\.css|\.ico$/,
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


var markdown = function(str){
	var data = '<div id="toc">' + md(toc(str)) + '</div>';
	data += '<div id="md">' + md(str) + '</div>'
	return data;
}

style += kit.fs.readFileSync(kit.path.join(pwd, 'node_modules/highlight.js/styles/') + theme + '.css');
readme = '<style>' + style + '</style>' + markdown(readme);


formatData = function(md, url, repo){
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
			if(repo){
				return match.replace(p1, 'https://github.com/' + repo + '/blob/master/' + p1);
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

	if(!/^http/.test(remoteUrl)){
		// Reguard as a github repo
		repo = remoteUrl;
		remoteUrl = "https://raw.githubusercontent.com/" + remoteUrl + "/master/readme.md";
	}
	else {
		if(filterRe.test(remoteUrl)){
			res.statusCode = 404;
			res.end();
			return;
		}
	}

	kit.log("Render " + remoteUrl.green);

	if(cache[remoteUrl]){
		kit.log("Done (from cache)".cyan);
		res.end(cache[remoteUrl]);
	}
	else {
		kit.request(remoteUrl).then(function(r){
			var data = ''
			if(repo && r === 'Not Found'){
				remoteUrl = remoteUrl.replace('readme.md', 'README.md')
				kit.log("Retry " + remoteUrl.green);
				kit.request(remoteUrl).then(function(r){
					if(repo && r === 'Not Found'){
						remoteUrl = remoteUrl.replace('README.md', 'Readme.md')
						kit.log("Retry " + remoteUrl.green);
						kit.request(remoteUrl).then(function(r){
							kit.log("Done".cyan);
							res.end(formatData(r, remoteUrl, repo));
						});
					}
					else {
						kit.log("Done".cyan);
						res.end(formatData(r, remoteUrl, repo));
					}
				});
			}
			else {
				kit.log("Done".cyan);
				res.end(formatData(r, remoteUrl, repo));
			}
		}, function(){});
	}
}).listen(port);


kit.log('Create Server at 127.0.0.1:' + (port + '').green)

var url = cmder.args[0] || ''
if(url[0] === '-'){
	url = '';
}

kit.open('http://127.0.0.1:' + port + '/' + url);
