const AdmZip = require("adm-zip");
const cheerio = require('cheerio');
const {NodeVM} = require('vm2');

let inputs = {
  "one":"1. hello \n2. world",
  "two":"this is second line",
  "a":1.1,
  "b":2,
  "c":3,
  "ifelse":true,
  "test":true
}

function generateDocx(fileName, dic){

  const zip = new AdmZip(fileName);
  const xml = zip.readAsText("word/document.xml").replace("﻿","");
  const $ = cheerio.load(xml, {
    normalizeWhitespace: true,
    xmlMode: true
  })
  
  // get the list of the variables
  $('w\\:sdt').each((index, element) => {

    const title = $(element).children("w\\:sdtPr").children("w\\:alias").attr("w:val")
    const tag = $(element).children("w\\:sdtPr").children("w\\:tag").attr("w:val")
    console.log("the title of the cc is ", title)
    switch(tag){

      case "var":
        if(dic[title]){

          const value = dic[title]
          if(isNaN(value) && value.includes("\n")){
            //handle multiple paragraphs 
            const paragraphs = value.split("\n")
            paragraphs.map((item)=>{
              $(element).children('w\\:sdtContent').append(`<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:color w:val="00000000"/></w:rPr><w:t>${item}</w:t></w:r></w:p>`)
            })
          }else{
            if($(element).children('w\\:sdtContent').children('w\\:r').children('w\\:t').text() == ""){
              
              if($(element).children('w\\:sdtContent').children("w\\:p").children('w\\:r').children('w\\:t').text() ==""){
                // if the content control in a table cell
                $(element).children('w\\:sdtContent').children("w\\:tc").children("w\\:p").children('w\\:r').children('w\\:t').text(value)
              }else{
                // if the content control is a paragraph
                $(element).children('w\\:sdtContent').children("w\\:p").children('w\\:r').children('w\\:t').text(value)
              }
            }else{
              // if the content control in a sentence
              $(element).children('w\\:sdtContent').children('w\\:r').children('w\\:t').text(value)
            }
          }
  
          $(element).children("w\\:sdtPr").children("w15\\:appearance").attr("w15:val","hidden")
          $(element).children("w\\:sdtPr").children("w\\:lock").remove()
        }
        break
      case "formula":
        let result = get_variables(title, dic)

        if($(element).children('w\\:sdtContent').children('w\\:r').children('w\\:t').text() == ""){
          $(element).children('w\\:sdtContent').children('w\\:tc').children('w\\:p').children('w\\:r').children('w\\:t').text(result)
        }else{
          $(element).children('w\\:sdtContent').children('w\\:r').children('w\\:t').text(result)
        }
        $(element).children("w\\:sdtPr").children("w15\\:appearance").attr("w15:val","hidden")
        $(element).children("w\\:sdtPr").children("w\\:lock").remove()

        break
      case "if":

        if(typeof dic[title] == "boolean"){
          if(!dic[title]){
            $(element).remove()
          }else{
            $(element).children("w\\:sdtPr").children("w15\\:appearance").attr("w15:val","hidden")
          }
        } 
          
        break;
      case "else":
        if(typeof dic[title] == "boolean"){
          if(dic[title]){
            $(element).remove()
          }else{
            $(element).children("w\\:sdtPr").children("w15\\:appearance").attr("w15:val","hidden")
          }
        } 
        break;
      case "default":
        throw Errror("the content control tag is wrong.")
    }

  // save
  
})
zip.updateFile("word/document.xml",$.xml())
zip.writeZip('output.docx')
}

function get_variables(title, dic){

  const data = title.split(",")
  let equation = data[0]
  const decimal = data[1]
  const vars = data[0].split(/[-+*()]/)
  let canCompute = true


  for(let i =0; i<vars.length;i++){
    const variable = vars[i]

    if(variable && isNaN(variable)){
      if(dic[variable]){
        equation = equation.replace(variable,dic[variable])
      }else{
        canCompute = false
        break
      }
    }
  }

  if(canCompute){
    let ext = {}
    const vm = new NodeVM({
      console: 'inherit',
        sandbox: {equation,ext},
        require: {
            external: true,
        }
    });
    vm.run(`
      ext.exports =eval(equation)
    `);
    let result = ext["exports"]
    result = result.toFixed(decimal)

    return result
  }else{
    return null
  }

}

module.exports = { generateDocx };