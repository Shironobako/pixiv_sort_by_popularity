﻿// ==UserScript==
// @name        pixiv_sort_by_popularity
// @name:zh-CN        pixiv_sort_by_popularity
// @name:zh-TW        pixiv_sort_by_popularity
// @name:ja        pixiv_sort_by_popularity
// @namespace   pixiv_sort_by_popularity
// @supportURL  https://github.com/zhuzemin
// @description non premium menber use "Sort by popularity"
// @description:zh-CN non premium menber use "Sort by popularity"
// @description:zh-TW non premium menber use "Sort by popularity"
// @description:ja non premium menber use "Sort by popularity"
// @include     https://www.pixiv.net/*/tags/*
// @include     https://www.pixiv.net/tags/*
// @version     1.01
// @run-at      document-start
// @author      zhuzemin
// @license     Mozilla Public License 2.0; http://www.mozilla.org/MPL/2.0/
// @license     CC Attribution-ShareAlike 4.0 International; http://creativecommons.org/licenses/by-sa/4.0/
// @grant       GM_xmlhttpRequest
// @grant         GM_registerMenuCommand
// @grant         GM_setValue
// @grant         GM_getValue
// @connect-src workers.dev
// ==/UserScript==
var config = {
  'debug': false
}
var debug = config.debug ? console.log.bind(console)  : function () {
};

//this userscript desire for free member use "Sort by popularity"

//default
//pixiv search request through this url will use my cookie.
var cloudFlareUrl='https://proud-surf-e590.zhuzemin.workers.dev/ajax/';

//Obejct use for xmlHttpRequest
class requestObject{
    constructor(keyword,page,order,mode) {
        this.method = 'GET';
        this.url = cloudFlareUrl+'https://www.pixiv.net/ajax/search/artworks/'+keyword+'?word='+keyword+'&order='+order+'&mode='+mode+'&p='+page+'&s_mode=s_tag&type=all';
        this.data=null,
            this.headers = {
                'User-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0',
                'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'
                //'Accept': 'application/atom+xml,application/xml,text/xml',
                //'Referer': window.location.href,
            };
        this.charset = 'text/plain;charset=utf8';
        this.package=null;
    }
}

var btn;
var page;
var select;

// prepare UserPrefs
setUserPref(
    'cloudFlareUrl',
    cloudFlareUrl,
    'Set cloudFlareUrl',
    `cloudFlareUrl only working on "Sort by popularity"`,
    ','
);


//for override fetch, I think override function sure insert to page, otherwise userscript don't have permission modified fetch in page?
function addJS_Node (text)
{
    var scriptNode                      = document.createElement ('script');
    scriptNode.type                     = "text/javascript";
    if (text)  scriptNode.textContent   = text;

    var targ    = document.getElementsByTagName('head')[0] || d.body || d.documentElement;
    targ.appendChild (scriptNode);
}



//override fetch
function intercept(){
    //insert override function to page
    addJS_Node(`
    var newData;
    var interceptEnable;
    var constantMock = window.fetch;
    window.fetch = function() {
        console.log(arguments);

    return new Promise((resolve, reject) => {
        constantMock.apply(this, arguments)
            .then((response) => {
    if(interceptEnable&&/https:\\/\\/www\\.pixiv\\.net\\/ajax\\/search\\/artworks\\/[^\\?&]*\\?word=[^\\?&]*&order=date(_d)?/.test(response.url)){
       var blob = new Blob([newData], {type : 'application/json'});
         console.log(newData);

        var newResponse=new Response(
        blob, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
        console.log(newResponse);
                    response=newResponse;
                    interceptEnable=false;
    }
                resolve(response);
            })
            .catch((error) => {
                reject(response);
            })
    });
 }
         `);
    //here is script end,
    //in console ,log show fetch response body has been changed <--- not very sure
    //and page have react ---> stay blank for ever
    //my confuse is: even comment "return data" (line:93), page still return blank,
    //that makes me wonder: maybe this override function miss something.
    //if my terrible code can be understanding somehow,
    //and knoa san have nothing else todo in leisure time,
    //knoa san can you take while, look my newbie problem?
    //of cource if too painful read my code, I totally understand!
    //knoa san can read to here already be my greatest honor, and I'm very happy!
}

//userscript entry
var init=function(){
        //create button
    if(window.self === window.top){
        debug("init");
        cloudFlareUrl=GM_getValue('cloudFlareUrl')||cloudFlareUrl;
        intercept();
        var div=document.querySelectorAll('div.sc-LzMhL.krKUte')[1];
        btn =document.createElement('button');
        btn.innerHTML='Sort by popularity';
        btn.addEventListener('click',sortByPopularity);
        div.insertBefore(btn,null);
        select=document.createElement('select');
        select.id='sortByPopularity';
        var optionObj={
            'Popular with all':'popular_d',
            'Popular (male)':'popular_male_d',
            'Popular (female)':'popular_female_d'
        }
        for(var key of Object.keys(optionObj)){
            var option=document.createElement('option');
            option.innerHTML=key;
            option.value=optionObj[key];
            select.insertBefore(option,null);
        }
        div.insertBefore(select,null);
    }
}

window.addEventListener('load', init);

//get current search word, then use xmlHttpRequest get response(from my server)
function sortByPopularity(e) {
    btn.innerHTML='Searching...'
    var keyword;
        var matching=window.location.href.match(/https:\/\/www\.pixiv\.net\/(\w*\/)?tags\/(.*)\/artworks\?(order=[^\?&]*)?&?(mode=(\w\d*))?&?(p=(\d*))?/);
        keyword=matching[2]
    debug(e.target.tagName)
    if(/(\d*)/.test(e.target.textContent)&&(e.target.tagName=='SPAN'||e.target.tagName=="A")){
        page=e.target.textContent.match(/(\d*)/)[1];
    }
    else if(e.target.tagName=='svg'||e.target.tagName=='polyline'){
            if(e.target.parentElement.tagName=='a'){
                page=e.target.parentElement.href.match(/p=(\d*)/)[1];

            }
            else {
                page=e.target.parentElement.parentElement.href.match(/p=(\d*)/)[1];

            }
    }
        else{
            page=1;
    }
    page=parseInt(page);
        debug(keyword);
        debug('page: '+page);
        var order=document.querySelector('#sortByPopularity').value;
        var mode;
        if(/(&|\?)mode=([\d\w]*)/.test(window.location.href)){
            mode=window.location.href.match(/(&|\?)mode=([\d\w]*)/)[2];
        }
        else {
            mode='all';
        }
        var obj=new requestObject(keyword,page,order,mode);
        request(obj,function (responseDetails) {

            unsafeWindow.newData=JSON.stringify(responseDetails.response,null,2);
            unsafeWindow.interceptEnable=true;
            //trigger fetch by click "Newest" or "Oldest"
            var div=document.querySelectorAll('div.sc-LzMhL.krKUte')[1];
            div.querySelector('a').click();
            var interval=setInterval(function () {
                var nav=document.querySelector('nav.sc-LzNRw.qhAyw');
                if(nav!=null){
                    nav.addEventListener('click',sortByPopularity);
                    nav.childNodes[1].childNodes[0].innerText=page;
                    if(page<=7&&page>1){
                        nav.childNodes[1].href=nav.childNodes[page].href;
                        nav.childNodes[page].innerText=1;
                        nav.childNodes[page].href=nav.childNodes[0].href;
                        nav.insertBefore(nav.childNodes[1],nav.childNodes[page]);
                        nav.insertBefore(nav.childNodes[page],nav.childNodes[1]);

                    }
                    else if(page>7){
                        //nav.insertBefore(nav.childNodes[1],nav.childNodes[8]);
                        for(var i=2;i<8;i++){
                            nav.childNodes[i].childNodes[0].innerText=page+i-1;
                            nav.childNodes[i].href=nav.childNodes[i].href.replace(/p=\d*/,'p='+(page+i-1));
                        }
                    }
                    if(page!=1){
                        nav.childNodes[0].style='opacity:1!important;';
                        nav.childNodes[0].href=nav.childNodes[8].href.replace(/p=\d*/,'p='+(page-1));
                        nav.childNodes[8].href=nav.childNodes[8].href.replace(/p=\d*/,'p='+(page+1));

                    }
                    btn.innerHTML='Sort by popularity';
                    clearInterval(interval);

                }
            },2000);
        });

}
function request(object,func) {
    GM_xmlhttpRequest({
        method: object.method,
        url: object.url,
        headers: object.headers,
        responseType: 'json',
        overrideMimeType: object.charset,
        timeout: 60000,
        //synchronous: true
        onload: function (responseDetails) {
            debug(responseDetails);
            //Dowork
            func(responseDetails);
        },
        ontimeout: function (responseDetails) {
            //Dowork
            func(responseDetails);

        },
        ononerror: function (responseDetails) {
            debug(responseDetails);
            //Dowork
            func(responseDetails);

        }
    });
}
function setUserPref(varName, defaultVal, menuText, promtText, sep){
    GM_registerMenuCommand(menuText, function() {
        var val = prompt(promtText, GM_getValue(varName, defaultVal));
        if (val === null)  { return; }  // end execution if clicked CANCEL
        // prepare string of variables separated by the separator
        if (sep && val){
            var pat1 = new RegExp('\\s*' + sep + '+\\s*', 'g'); // trim space/s around separator & trim repeated separator
            var pat2 = new RegExp('(?:^' + sep + '+|' + sep + '+$)', 'g'); // trim starting & trailing separator
            //val = val.replace(pat1, sep).replace(pat2, '');
        }
        //val = val.replace(/\s{2,}/g, ' ').trim();    // remove multiple spaces and trim
        GM_setValue(varName, val);
        // Apply changes (immediately if there are no existing highlights, or upon reload to clear the old ones)
        //if(!document.body.querySelector(".THmo")) THmo_doHighlight(document.body);
        //else location.reload();
    });
}
