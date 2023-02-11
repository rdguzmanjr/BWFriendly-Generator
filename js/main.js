let defaultURL="http://wwww.google.com";

let respo=false;

let s3URLFolder = "nars/nars_hotspot"
let s3URL =     "https://assets.nativetouch.io/2023/"+s3URLFolder.replace(/^\/|\/$/g, "");
let s3URLimage = s3URL+"/images/";
let s3URLJs =   s3URL+"/js/";

let size="320x480";
let ws=size.split("x")[0];
let hs=size.split("x")[1];
let wsp=size.split("x")[0]+"px";
let hsp=size.split("x")[1]+"px";
let CTag="\t<script type=\"text/javascript\">\n\t\tvar clickTag = \"{{CLICK_URL}}"+defaultURL+"\";\n\t</script>\n"
let lines;
let tmr; 
let dirName="";
 output={};
 

 function fetchValue(){
    s3URLFolder=document.getElementById("folderinputbox").value;
    respo=document.getElementById("checkbox-group-1676039463256-0").checked;
    s3URL =  "https://assets.nativetouch.io/2023/"+s3URLFolder.replace(/^\/|\/$/g, "");;
    s3URLimage = s3URL+"/images/"; 
    s3URLJs =   s3URL+"/js/";
 }

//let str;
 //DROPPER
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
            fetchValue();
            const files = event.dataTransfer.items;
            for (let i = 0; i < files.length; i++) {
                const item = files[i].webkitGetAsEntry();
                if (item.isFile) { alert('Can only handle folders for now!!')
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
            }
     }else{
        alert("Please set an s3 folder in settings.");
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
        clearTimeout(tmr);
        tmr=setTimeout(()=>{
            myhtml=o.html;
            mycss=o.css;
            myjs=o.js;
            str=myhtml;
            str=removeExternalLinks(str);
            str=processHtmlClickTag(str);
            if(mycss!=undefined){
                str=insertAfterMatch(str,"\n<style>\n"+mycss+"\n</style>\n",/<\/head/g);
            }
            if(myjs!=undefined){
                str=insertAfterMatch(str,"\n<script>\n"+myjs+"\n</script>\n",/<\/body/g);    
             }
             str=processMetaAdSize(str);
             str=processReplaceURL(str);
             if(!respo)
             str=updateCssContainer(str) 

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
    
    if(str.search(/<meta.+?ad\.size.+("|')>/g)!=-1)
    str=str.replace(/<meta.+?ad\.size.+("|')>/g,"<meta name=\"ad.size\" content=\"width="+ws+",height="+hs+"\">");
    else
    str=insertBeforeMatch(str,"\n\t<meta name=\"ad.size\" content=\"width="+ws+",height="+hs+"\">",/<\/title\s*>/g);
    
    return str;
 }


 function updateCssContainer(str) { 
  let [matchedString, newString] = extractMatch(str,/\.container\s*{([^{}]+)}/g);
  if (matchedString) {
      wiwi=matchedString.replace(/width\s*(:(.*?);)/, 'width:' + wsp + ';');
      hihi=wiwi.replace(/height\s*(:(.*?);)/, 'height:' + hsp + ';');
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

 /*JR's REGEX STRING UTILS*/

function extractMatch(string, pattern) {
    let match = string.match(pattern);
    if (match) {
      return [match[0], string.replace(match[0], "**tobereplaced**")];
    }
    return [null, string];
}

function insertBeforeMatch(string,replacement,pattern){
   return result = string.replace(pattern, `$& ${replacement}`);
}
function insertAfterMatch(string,replacement,pattern){
    return result = string.replace(pattern, `${replacement} $&`);
}


/* For Future
 function sendRequestToServer(str,dir){
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:3000/data", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ message:str,filename:dir}));
        xhr.onload = function() {
            //console.log(this.responseText);
        };
        xhr.onerror= function() {
            //console.log('error');
          };
      
 }
 */