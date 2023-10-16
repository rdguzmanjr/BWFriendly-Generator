'use strict'; 

let defaultURL="http://wwww.google.com";
let respo=false;
let clientIframe=false;
let s3URLFolder = ""
let s3URL =     "https://assets.nativetouch.io/2023/"+s3URLFolder.replace(/^\/|\/$/g, "");
let s3URLimage = "";
let s3URLJs =   "";
let s3ClientURL = "";
let adSize={};

let CTag=`\t<script type="text/javascript">\n\t\tvar clickTag = "{{CLICK_URL}}${defaultURL}";\n\t</script>\n`;

var initedTmr,clientTmr;
var outputObj={};


 function fetchValue(){
    s3URLFolder=document.getElementById("folderinputbox").value.trim().replace(/^\/|\/$/g, "");
    respo=document.getElementById("checkbox-respo").checked;
    clientIframe=document.getElementById("checkbox-iframe").checked;
    s3URL =  "https://assets.nativetouch.io/2023/"+s3URLFolder;
    s3ClientURL = document.getElementById("clientURLinput").value.trim();
 }

 var dropZone = document.getElementById('drop-zone');
 dropZone.addEventListener('dragover', function(e) {
     e.preventDefault();
     e.stopPropagation();
     dropZone.classList.add('dragover');
 });
 dropZone.addEventListener('dragleave', function(e) {
     e.preventDefault();
     e.stopPropagation();
     dropZone.classList.remove('dragover');
 });
 
 dropZone.addEventListener('drop', function(e) {
     outputObj={};
     e.preventDefault();
     e.stopPropagation();
     fetchValue();
     if(document.getElementById("folderinputbox").value!=""){
            const files = event.dataTransfer.items;
            for (let i = 0; i < files.length; i++) {
                const item = files[i].webkitGetAsEntry();
                if (item.isFile) { 
                    alert('Alert: Only Creative Workspace Folder is allowed.');
                } else if (item.isDirectory) {
                    readMainDirectory(item,item.name);
                }
            }
     }else{
        alert("Alert: Please indicate the workspace folder path in settings.");
     }
 });


 function readMainDirectory(item,dirname){
     if(!outputObj.hasOwnProperty(dirname))
     outputObj[dirname]={};
     if(!clientIframe){
            readDirectory(item,dirname);
     }else{
            clearTimeout(clientTmr);
            clientTmr=setTimeout(()=>{
                generateClientIframe(outputObj);
            },2000)
            
     }
    
 }

 function readDirectory(item,dirname=null) {
    const reader = item.createReader();
    reader.readEntries((entries) => {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.isFile && entry.name!='.DS_Store' && !entry.name.endsWith('.min.js')) {
                    entry.file((file) => {
                        const reader = new FileReader();
                        reader.readAsText(file);
                        reader.onload = ()=>{
                            if(entry.name=="index.html"){
                                outputObj[dirname].html=reader.result;
                            }else if(entry.name=="style.css"){
                                outputObj[dirname].css= reader.result;
                            }else if(entry.name.endsWith(".js")){
                                outputObj[dirname].js = reader.result;
                            }
                            clearTimeout(initedTmr)
                            initedTmr=setTimeout(()=>{
                                generateOutput(outputObj);
                            },2000)
                        }
                    });
            } else if (entry.isDirectory) {
                if(entry.name!="images")
                readDirectory(entry,dirname);
            }
            
        }
    });
}



 function generateClientIframe(ooobj){
    let _dir,_templateHtml,_key;
    Object.entries(ooobj).forEach(entry => {
        const [key, value] = entry;
        _key=encodeURI(key);
        _dir=key.match(/(\d+)(x|X)(\d+)/);
        if(_dir===null){
            _dir=[0,320,2,480]; 
        }
        _templateHtml=htmlTempString;
        _templateHtml=_templateHtml.replaceAll('***clientW***',_dir[1]);
        _templateHtml=_templateHtml.replaceAll('***clientH***',_dir[3]);
        _templateHtml=_templateHtml.replace('***clienturl***',s3ClientURL);
        _templateHtml=_templateHtml.replace('***clientS3Path***',`${s3URL}/${_key}/index.html`);
        download(key,_templateHtml);
    })

 }



 function generateOutput(ooobj){
        let str,myhtml,myjs,mycss;
        Object.entries(ooobj).forEach(entry => {
            const [key, value] = entry;
            myhtml=value.html;
            mycss=value.css;
            myjs=value.js;
           
            str=myhtml;
            str=removeExternalLinks(str);
            str=processHtmlClickTag(str);
            myjs=fixWindowOnLoad(myjs);

            if(mycss!=undefined){
                str=insertAfterMatch(str,"\n<style>\n"+mycss+"\n</style>\n",/<\/head/g);
            }
            if(myjs!=undefined){
                str=insertAfterMatch(str,"\n<script>\n"+myjs+"\n</script>\n",/<\/body/g);    
            }
            if(respo)
            str=addmaincontainer(str);
            //str=processMetaAdSize(str);
            s3URLimage = `${s3URL}/${key}/images/`;
            s3URLJs =    `${s3URL}/${key}/js/`;
            str=processReplaceURL(str,key);
            download(key,str)
        });
 }
 function addmaincontainer(str){
    str=insertBeforeMatch(str,`\n\t<div class='main-container'>`,/<body>/g);
    str=insertAfterMatch(str,`</div>\n`,/<\/body>/g);
    str=insertBeforeMatch(str,`\n.main-container {\n\twidth:100vh;\n\theight:100vh;\n}`,/<style>/g);
    return str;
 }
 function removeExternalLinks(str){
       str=str.replace(/<\s*script.+?src\s*=\s*('|")\s*([a-z0-9])([a-z0-9-_/]+)([a-z0-9])\.js\s*("|')(\s*|.+)>\s*<\/script\s*>/g,"");
       str=str.replace(/<\s*link.+?href\s*=\s*('|")\s*([a-z0-9])([a-z0-9-_/]+)([a-z0-9])\.css\s*("|')(\s*|.+)>/g,"");
       
       return str; 
}
 function processHtmlClickTag(str){
    if(str.search(/(var|let|const)\s*clickTag\s*=\s*("|')\s*/g)!=-1)
    str=insertBeforeMatch(str,'{{CLICK_URL}}',/(var|let|const)\s*clickTag\s*=\s*("|')\s*/g);
    else
    str=insertAfterMatch(str,CTag,/<\/head/g);

    return str;
 }
 function processReplaceURL(str,dirname){
    if(str.search(/(https|http):\/\/(.+)\/images\//g)!=-1){
        str=str.replace(/(https|http):\/\/(.+)\/images\//g, s3URLimage);
    }else if(str.search(/images\//g)!=-1){
       str=str.replace(/images\//g,s3URLimage);
    }

    if(str.search(/(https|http):\/\/(.+)\/js\//g)!=-1){
        str=str.replace(/(https|http):\/\/(.+)\/js\//g, s3URLJs);
    }else if(str.search(/js\//g)!=-1){
       str=str.replace(/js\//g, s3URLJs);
    }
    return str;
}
function processMetaAdSize(str){
      let m=str.match(/\.container\s*{([^{}]+)}/g); 
      let n=m[0].match(/width\s*:\s*((\d+)(px|%))\s*;/);
      let h=m[0].match(/height\s*:\s*((\d+)(px|%))\s*;/);
      if(n[3]!="%"&&h[3]!="%"){
        adSize.width=n[2];
        adSize.height=h[2];
      }else{
        adSize.width="320";
        adSize.height="480";
        if(!respo)
        str=updateContainerStyle(str);
    }
    if(str.search(/<meta.+?ad\.size.+("|')>/g)!=-1)
    str=str.replace(/<meta.+?ad\.size.+("|')>/g,"<meta name=\"ad.size\" content=\"width="+adSize.width+",height="+adSize.height+"\">");
    else
    str=insertBeforeMatch(str,"\n\t<meta name=\"ad.size\" content=\"width="+adSize.width+",height="+adSize.height+"\">",/<\/title\s*>/g);
    
    return str;
 }

 function updateContainerStyle(str) { 
  let wiwi,hihi;
  let [matchedString, newString] = extractMatch(str,/\.container\s*{([^{}]+)}/g);
  if (matchedString) {
      wiwi=matchedString.replace(/width\s*(:(.*?);)/, 'width:'+adSize.width+'px;');
      hihi=wiwi.replace(/height\s*(:(.*?);)/, 'height:'+adSize.height+'px;');
      str=newString.replace("**tobereplaced**",hihi)
  } 
  return str;
}

 function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
 function fixWindowOnLoad(str){
      if(str==undefined)return undefined;
      if(str.search(/window\.onload\s*=(\s*\w+)(;|)/)!=-1){
        var funct=str.match(/window\.onload\s*=(\s*\w+)(;|)/);
        str=str.replace(/window\.onload\s*=(\s*\w+)(;|)/,'')
        if(str.search(/\}\s*\)\s*\(\)\s*(;|)\s*$/)!=-1) {
            str=insertAfterMatch(str,`\n${funct[1].trim()}();\n`,/\}\s*\)\s*\(\)\s*(;|)\s*$/);
        }else{
            str=str+=`${funct[1].trim()}();`;
        }    
      }
      return str;
}
 /*JR's REGEX STRING UTILS*/

function extractMatch(string, pattern) {
    let match = string.match(pattern);
    if (match) {
      return [match[0], string.replace(match[0], "**tobereplaced**")];
    }
    return [null, string];
}
function insertBeforeMatch(string,replacement,pattern){
    return string.replace(pattern, `$&${replacement}`);
}
function insertAfterMatch(string,replacement,pattern){
    return string.replace(pattern, `${replacement}$&`);
}

let htmlTempString=`<!DOCTYPE html>\n`+
`<html lang="en">\n`+
`<head>\n`+
`   <meta charset="UTF-8"></meta>\n`+
`   <meta http-equiv="X-UA-Compatible" content="IE=edge">\n`+
`   <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`+
`   <title>Document</title>\n`+
`   <meta name="ad.size" content="width=***clientW***, height=***clientH***">\n`+
`   <script type="text/javascript">\n`+
`       var clickTag = "{{CLICK_URL}}***clienturl***";\n`+
`var NTparams = {\n`+

   ` campaignId : "{{CAMPAIGN_ID}}",\n`+

   ` creativeId : "{{CREATIVE_ID}}",\n`+

    `placementId : "{{PLACEMENT_ID}}",\n`+

   ` lineItemId : "{{LINE_ITEM_ID}}",\n`+

    `lineItemIdAlt : "{{LINE_ITEM_ID_ALT}}",\n`+

    `lineItemName : "{{LINE_ITEM_NAME}}",\n`+

   ` advertiserId : "{{ADVERTISER_ID}}",\n`+

   ` creativeSize : "{{WIDTH}}x{{HEIGHT}}",\n`+

    `appId : "{{APP_ID}}",\n`+

    `appName : "{{APP_NAME}}",\n`+

    `appBundle : "{{APP_BUNDLE}}",\n`+

    `inventorySource : "{{INVENTORY_SOURCE}}",\n`+
   
    `domain : "{{DOMAIN}}",\n`+

    `countryCode : "{{COUNTRY_CODE}}",\n`+

    `zipCode : "{{ZIP_CODE}}",\n`+

    `auctionId : "{{AUCTION_ID}}",\n`+

    `gpsLat : "{{LAT}}",\n`+

    `gpsLng : "{{LONG}}",\n`+

    `userId : "{{USER_ID}}",\n`+

    `ipAddress : "{{IP_ADDRESS}}",\n`+

    `};\n`+
`   </script>\n`+
`   <style>\n`+
`     html, body {\n`+
`       margin : 0;\n`+
`       padding :0;\n`+
`       height: 100vh;\n`+
`      }\n`+
`     .clickthru {\n`+
`       position: absolute;\n`+
`       width : 100%;\n`+
`       height : 100%;\n`+
`       background-color: #ff000000;\n`+
`      }\n`+
`   </style>\n`+
`</head>\n`+
`<body>\n`+
`   <div class="clickthru"></div>\n`+
`   <iframe src="***clientS3Path***" frameborder="0" width="***clientW***" height="***clientH***"></iframe>\n`+
`   <script>\n`+
`       document.querySelector('.clickthru').addEventListener('click',exit );\n`+
`function loadPixelNT () {\n`+

   ` const script = document.createElement('script');\n`+
    
   ` script.src = 'https://assets.nativetouch.io/PixelNT/PixelNT.js';\n`+
    
  `  script.onload = initPixelNT;\n`+

   ` document.body.appendChild ( script );\n`+

 `}\n`+

 `function initPixelNT () {\n`+

   ` PixelNT.init ( NTparams );\n`+

   ` PixelNT.fireImpressionPixel ('rendered_impression');\n`+

   ` PixelNT.fireTotalCustomEvents ( 1 );\n`+

 `}\n`+

 `function exit () {\n`+

   ` if ( PixelNT ) {\n`+
     `  PixelNT.fireEngagementPixel('Clickthru Exit');\n`+
    `}\n`+

  ` window.open(clickTag);\n`+

 `}\n`+

 `loadPixelNT ();\n`+
`   </script>\n`+
`</body>\n`+
`</html>`;

