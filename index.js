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
	markdown = require('marked'),
	hl = require('highlight.js');

var style = kit.fs.readFileSync('markdown.css'),
	theme = cmder.style || 'rainbow',
	port = cmder.port || 8080,
	cache = {},
	filterRe = /\.png|\.jpg|\.jpeg|\.gif|\.js|\.css|\.ico$/,
	readme = kit.fs.readFileSync('readme.md');

style += kit.fs.readFileSync('node_modules/highlight.js/styles/' + theme + '.css');
readme = '<style>' + style + '</style>' + markdown(readme + '');

markdown.setOptions({
	highlight: function (code) {
		return hl.highlightAuto(code).value;
  }
});



formatData = function(md, url, repo){
	var data = '';
	md = md.replace(/!?\[[^\[\]]*\]\(([^\[\]]*)\)/g, function(match, p1){
		if(p1.indexOf('http') === 0 || p1.indexOf('//') === 0){
			return match;
		}
		else{
			var dir = url.split('/');
			dir.pop();
			return match.replace(p1, dir.join('/') + '/' + p1);
		}
	});
	md = md.replace(/href\s*=\s*['"]([^'"]*)["']/g, function(match, p1){
		if(p1.indexOf('http') === 0 || p1.indexOf('//') === 0){
			return match;
		}
		else{
			console.log(match, '--', p1)
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
	res.writeHead(200, {'Content-type' : 'text/html'});
	res.write('<meta charset=utf8>')
	res.write('<title>Remote Markdown</title>')

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
