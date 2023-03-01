'use strict'; 

let defaultURL="http://wwww.google.com";
let respo=false;
let s3URLFolder = "nars/nars_hotspot"
let s3URL =     "https://assets.nativetouch.io/2023/"+s3URLFolder.replace(/^\/|\/$/g, "");
let s3URLimage = s3URL+"/images/";
let s3URLJs =   s3URL+"/js/";

let adSize={};
let output={};

let CTag="\t<script type=\"text/javascript\">\n\t\tvar clickTag = \"{{CLICK_URL}}"+defaultURL+"\";\n\t</script>\n"
let tmr; 
let dirName="";


 function fetchValue(){
    s3URLFolder=document.getElementById("folderinputbox").value.trim().replace(/^\/|\/$/g, "");
    respo=document.getElementById("checkbox-respo").checked;
    s3URL =  "https://assets.nativetouch.io/2023/"+s3URLFolder;
    s3URLimage = s3URL+"/images/"; 
    s3URLJs =   s3URL+"/js/";
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
     e.preventDefault();
     e.stopPropagation();
     if(document.getElementById("folderinputbox").value!=""){
            if(event.dataTransfer.items.length==1){
            fetchValue();
            const files = event.dataTransfer.items;
            for (let i = 0; i < files.length; i++) {
                const item = files[i].webkitGetAsEntry();
                if (item.isFile) { alert('Alert: Only Creative Workspace Folder is allowed.')
                    /*console.log("File:", item.name);
                    if (item.name.endsWith(".js")) {
                        item.file((file) => {
                            const reader = new FileReader();
                            reader.readAsText(file);
                            reader.onload = () => {
                                console.log(reader.result);
                            };
                        });
                    }*/
                } else if (item.isDirectory) {
                    dirName=item.name;
                    readDirectory(item);
                }
            }}else{
                alert("Alert: Only 1 Creative Workspace Folder at a time.");
            }
     }else{
        alert("Alert: Please indicate the workspace folder path in settings.");
     }
 });
 
 function readDirectory(item) {
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
                                   output.html=reader.result;
                             }else if(entry.name=="style.css"){
                                   output.css= reader.result;
                             }else if(entry.name.endsWith(".js")){
                                   output.js= reader.result;
                             }
                             mergeOutputs(output)
                         }
                     });
             } else if (entry.isDirectory) {
                 if(entry.name!="images")
                 readDirectory(entry);
             }
             
         }
     });
 }
 function mergeOutputs(o){
        let str,myhtml,myjs,mycss;
        clearTimeout(tmr);
        tmr=setTimeout(()=>{
            myhtml=o.html;
            mycss=o.css;
            myjs=o.js;
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
             str=processMetaAdSize(str);
             str=processReplaceURL(str);
             download(dirName,str)
        },1000)
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
 function processReplaceURL(str){
    if(str.search(/(https|http):\/\/(.+)\/images\//g)!=-1){
        str=str.replace(/(https|http):\/\/(.+)\/images\//g, s3URLimage);
    }else if(str.search(/images\//g)!=-1){
       str=str.replace(/images\//g, s3URLimage);
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