import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { strokesOnHole, timeFor, type League, type Round } from './league.ts';

// The PDF is created on demand from the saved round. No league records change.
export async function createScorecardsPdf(league: League, round: Round) {
  if (!round.groups.length) throw new Error('Generate pairings before opening scorecards.');
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(.08,.23,.18), gray = rgb(.36,.4,.37), rule = rgb(.65,.7,.66);
  const course = round.course ?? league.course;
  const players = new Map(league.players.map(p => [p.id,p]));
  const participants = new Map(round.participants.map(p => [p.playerId,p]));
  const clean = (s:string) => Array.from(s.replace(/[–—]/g,'-')).map(c=>{try{regular.encodeText(c);return c;}catch{return '?';}}).join('');
  const text = (page:PDFPage, value:string, x:number, y:number, size=10, font:PDFFont=regular, maxWidth?:number) => {
    let valueSafe=clean(value);
    if(maxWidth) while(valueSafe.length>1 && font.widthOfTextAtSize(valueSafe,size)>maxWidth) valueSafe=valueSafe.slice(0,-2)+'…';
    page.drawText(valueSafe,{x,y,size,font,color:green});
  };
  const line=(page:PDFPage,x1:number,y1:number,x2:number,y2:number)=>page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:.5,color:rule});
  const wrap=(value:string,font:PDFFont,size:number,maxWidth:number,maxLines:number)=>{
    const words=clean(value).replace(/\s+/g,' ').trim().split(' ').filter(Boolean),lines:string[]=[];
    for(const word of words){const current=lines.at(-1);const candidate=current?`${current} ${word}`:word;if(current&&font.widthOfTextAtSize(candidate,size)>maxWidth){if(lines.length===maxLines){lines[maxLines-1]=`${lines[maxLines-1].replace(/…$/,'')}…`;break;}lines.push(word);}else if(current)lines[lines.length-1]=candidate;else lines.push(word);}
    return lines.slice(0,maxLines);
  };
  const date=new Date(`${round.date}T12:00:00Z`).toLocaleDateString('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'});
  const instructions=round.instructions?.trim()??'';
  document.setTitle(`Sebastian Ladies Scorecards - ${round.date}`);
  document.setAuthor('Sebastian Ladies Golf League');
  let sheet=document.addPage([792,612]);
  text(sheet,'SEBASTIAN LADIES GOLF LEAGUE',30,568,20,bold);
  text(sheet,`${round.season??league.season}  |  ${date}  |  Red tees`,30,545,11);
  let y=510;
  const heading=()=>{text(sheet,'TEE TIME',30,y,10,bold);text(sheet,'GROUP',110,y,10,bold);text(sheet,'PLAYERS',175,y,10,bold);line(sheet,30,y-9,762,y-9);y-=37;};
  heading();
  round.groups.forEach((group,index)=>{
    if(y<60){sheet=document.addPage([792,612]);y=560;heading();}
    text(sheet,timeFor(round.firstTime,round.interval,index),30,y,11,bold);
    text(sheet,String(index+1),110,y,11);
    text(sheet,group.playerIds.map(id=>players.get(id)?.name??'Player').join('  /  '),175,y,10,regular,580);
    line(sheet,30,y-12,762,y-12);y-=39;
  });
  text(sheet,'Scorecards follow: two identical cards per group, one group per sheet.',30,28,9);

  round.groups.forEach((group,index)=>{
    const page=document.addPage([792,612]);
    const card=(top:number)=>{
      text(page,'SEBASTIAN LADIES',24,top-15,14,bold);
      text(page,`${round.date}  |  ${round.season??league.season}  |  Red tees`,24,top-31,9);
      text(page,`GROUP ${index+1}  -  ${timeFor(round.firstTime,round.interval,index)}`,560,top-16,12,bold);
      text(page,'CH = course handicap   PH = playing handicap',490,top-31,9);
      const instructionLines=instructions?wrap(instructions,regular,7.5,680,2):[];
      if(instructionLines.length){text(page,'EVENT:',24,top-45,7.5,bold);instructionLines.forEach((value,lineIndex)=>text(page,value,57,top-45-lineIndex*9,7.5));}
      // One front/back row for every player. Each cell has room for a written score.
      const widths=[172,...Array(9).fill(47),48,48,53];
      const xs=[24]; widths.forEach(w=>xs.push(xs[xs.length-1]+w));
      let gridTop=top-(instructionLines.length>1?65:instructionLines.length?55:42);
      for(let nine=0;nine<2;nine++){
        const headerHeight=23,rowHeight=20;
        const bottom=gridTop-headerHeight-4*rowHeight;
        page.drawRectangle({x:24,y:gridTop-headerHeight,width:744,height:headerHeight,color:rgb(.93,.96,.93)});
        const labels=[nine===0?'PLAYER / HANDICAP':'BACK NINE',...Array.from({length:9},(_,h)=>String(nine*9+h+1)),nine===0?'OUT':'IN','GROSS','NET'];
        labels.forEach((label,col)=>text(page,label,xs[col]+4,gridTop-10,col===0?8:9,bold));
        for(let h=0;h<9;h++) text(page,`P${course.par[nine*9+h]} / SI${course.strokeIndex[nine*9+h]}`,xs[h+1]+3,gridTop-20,6.5);
        for(let row=0;row<4;row++){
          const id=group.playerIds[row];const p=id?participants.get(id):undefined;
          const rowTop=gridTop-headerHeight-row*rowHeight;
          if(id){
            text(page,players.get(id)?.name??'Player',xs[0]+4,rowTop-9,8,bold,164);
            text(page,`CH ${p?.courseHandicap??'-'}  /  PH ${p?.playingHandicap??'-'}`,xs[0]+4,rowTop-17,6.5);
            for(let h=0;h<9;h++){
              const strokes=p?strokesOnHole(p.playingHandicap,course.strokeIndex[nine*9+h]):0;
              if(strokes>0) for(let dot=0;dot<Math.min(strokes,5);dot++) page.drawCircle({x:xs[h+1]+5+dot*5,y:rowTop-4,size:1.2,color:green});
              if(strokes<0) text(page,`give ${-strokes}`,xs[h+1]+3,rowTop-7,6);
            }
          }
          line(page,24,rowTop-rowHeight,768,rowTop-rowHeight);
        }
        xs.forEach(x=>line(page,x,gridTop,x,bottom));
        line(page,24,gridTop,768,gridTop);line(page,24,gridTop-headerHeight,768,gridTop-headerHeight);
        gridTop=bottom-5;
      }
      text(page,'Dots = strokes received. Enter gross and net totals in the BACK NINE row for each player.',24,top-280,7);
    };
    card(592);card(292);
    page.drawLine({start:{x:24,y:306},end:{x:768,y:306},thickness:.5,color:gray,dashArray:[4,4]});
  });
  return document.save();
}
