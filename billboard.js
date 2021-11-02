// node billboard.js --source=top100 --url=https://www.billboard.com/charts/hot-100

let minimist = require("minimist");
let axios = require("axios");
let path = require("path");
let jsdom = require("jsdom");
let pdf = require("pdf-lib");
let excel = require("excel4node");
let fs = require("fs");

let args = minimist(process.argv);

let dataProm = axios.get(args.url);
dataProm.then(function(response)
{
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    
    let songs = [];
    let charts = document.querySelectorAll("li.chart-list__element")
    for(let i = 0; i < charts.length; i++)
    {
        let details = 
        {
            rank : "",
            songname : "",
            singer : ""
        }

        let rank = charts[i].querySelectorAll("span.chart-element__rank.flex--column.flex--xy-center.flex--no-shrink > span.chart-element__rank__number")
        details.rank = rank[0].textContent;

        let owner = charts[i].querySelectorAll("span.chart-element__information > span.chart-element__information__song.text--truncate.color--primary")
        details.songname = owner[0].textContent;

        let ownername = charts[i].querySelectorAll("span.chart-element__information > span.chart-element__information__artist.text--truncate.color--secondary")
        details.singer = ownername[0].textContent;

        songs.push(details)
    }
    createexcel(songs)
    
    let team = [];
    for(let i = 0; i < songs.length; i++)
    {
        songs_in_rank(songs[i], team)
    }
    
    for(let i = 0; i < songs.length; i++)
    {
        rank_place(songs[i], team)
    }
    
    createfolder(team)

}).catch(function(err){console.log(err)})

function createfolder(team)
{
    if(fs.existsSync(args.source)== true)
    {
        fs.rmdirSync(args.source, {recursive : true})
    }
    fs.mkdirSync(args.source)
    
    for(let i = 0; i < team.length; i++)
    {
        let files = path.join(args.source, team[i].rank )
        for(let j = 0; j < team[i].owner.length; j++)
        {
            createPDF(team[i], team[i].owner[j], files )
        }
        
    }

}

function createPDF(team, owner, location)
{
    let rank = team.rank;
    let song = owner.Song;
    let singer = owner.Singer;

    let origBytes = fs.readFileSync("template.pdf");
    let bytesProm = new pdf.PDFDocument.load(origBytes);
    bytesProm.then(function(pdfDoc){
        let page = pdfDoc.getPage(0);
        page.drawText(rank, {
            x : 410,
            y : 440,
            size : 27
        })
        page.drawText(song, {
            x : 350,
            y : 375,
            size : 24
        })
        page.drawText(singer, {
            x : 330,
            y : 310,
            size : 18
        })

        let changedByte = pdfDoc.save();
        changedByte.then(function(changedByte)
        {
            fs.writeFileSync(location + ".pdf", changedByte, "utf-8");
        }).catch(function(err){console.log(err)})

    }).catch(function(err){console.log(err)})
}

function songs_in_rank(song, team)
{
    let idx = -1;
    for(let i = 0; i < team.length; i++)
    {
        if(team[i].rank == song.rank)
        {
            idx = i;
        }
    }
    if(idx == -1)
    {
        team.push({
            rank: song.rank,
            owner  :[]
        })
    }
}

function rank_place(song, teams)
{
    let index = -1;
    for(let i = 0; i < teams.length; i++)
    {
        if(teams[i].rank == song.rank)
        {
            index = i;
            break;
        }
    }
    teams[index].owner.push({
        Song : song.songname,
        Singer : song.singer
    })
    
}

function createexcel(song)
{
    let wb = new excel.Workbook();
    let sheet = wb.addWorksheet('Billboard top 100')
    sheet.cell(1,2).string("Song Name");
    sheet.cell(1,1).string("Rank");
    sheet.cell(1,3).string("Singer Name");
    sheet.column(3).setWidth(40);
    sheet.column(2).setWidth(30);
    for(let i = 0; i < song.length; i++)
    {
        sheet.cell(i + 2, 1).string(song[i].rank);
        sheet.cell(i + 2, 2).string(song[i].songname);
        sheet.cell(i + 2, 3).string(song[i].singer);
        
    }
    wb.write('Billboard top 100.xlsx')
}