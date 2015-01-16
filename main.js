// var uslug = require('uslug');
// var toc = require('marked-toc');
curURL = ''
$(function(){
	$('form').on('submit', function(){
		deal($('input').val() || 'dracupid/npm-up');
		$('#md').html('LOADING......');
		return false;
	})
})

window.cache = {}

function deal(remoteUrl){
	var isRepo = false;
	if(!remoteUrl){
		return false;
	}

	if(!/^http/.test(remoteUrl) && !/.md|.markdown^/i.test(remoteUrl)){
		isRepo = true;
	}

	if(cache[remoteUrl]){
		$('#toc').html(cache[remoteUrl][0]);
		$('#md').html(cache[remoteUrl][1]);
		return true;
	}
	else {
		getMarkdownP(isRepo, remoteUrl).then(function(md){
			formatData(md, remoteUrl, isRepo);
		});
	}
}

marked.setOptions({
	highlight: function (code, lang) {
		(lang == 'shell') && (lang = 'bash');

		hled = code
		try {
			hled = hljs.highlight(lang, code).value;
		} catch(e) {}

		return hled
  }
});
var renderer = new marked.Renderer();

renderer.heading = function (text, level, rawText) {
	var id = encodeURIComponent(rawText);
	return '<h' + level + ' id="' + id + '">' + text + '</h' + level + '>';
}

function repeat(text, n){
	var r = ''
	for(var i = 0; i< n; i++){
		r += text;
	}
	return r;
}

function toc(){
    var hs = $('h1, h2, h3, h4'), html = '';
    hs.forEach(function(e){
		var level = e.tagName[1],
			text = encodeURIComponent(e.textContent);
		html += '<a href="#' + text + '"><div>' + repeat('-', level - 1) + ' ' +  e.textContent + '</div></a>'

    });
    console.log(html);
    return html;
}
function slugify(a){
	return a;
}

var markdown = function(str){
	var md = marked(str, {renderer: renderer});
	$('#md').html(md);
	var tocs = toc();
	$('#toc').html(tocs);
	return [tocs, md];
}

function formatData(md, url, isRepo){
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
	cache[url.toLowerCase()] = markdown(md);
	return cache[url.toLowerCase()];
}

function getGithubReadmeP(repo){
	var def = $.Deferred();
	$.ajax({
		url: 'https://api.github.com/repos/' + repo + '/readme'
	}).then(function(data){
		if(!data || !data.content){
			def.resolve('');
		}
		else {
			def.resolve(atob(data.content));
		}
	}, function(err){
		console.log(err);
		def.resolve("")
	})
	return def.promise();
}

function fetchP(url){
    var def = $.Deferred();
    $.ajax({
		url: url
    }).then(function(data){
		def.resolve(data);
    }, function(err){
		console.log(err);
		def.resolve('')
    });
    return def.promise();
}

function getMarkdownP(isRepo, url){
	if(isRepo){
		return getGithubReadmeP(url);
	}
	else {
		return getReadmeP(url);
	}
}