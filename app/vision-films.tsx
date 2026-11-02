'use client';
import {useState} from 'react';
import {Play, ArrowRight} from 'lucide-react';
import './vision-films.css';

const films = [
  {id:'B6iXd_oFTkY', title:'Every remix leaves a new beginning.', name:'Pass It On', length:'1 MIN', poster:'pass-it-on.jpg', description:'One tiny game gains puzzles, crafting, teammates and hoverboard combat. The world grows. What came before stays.'},
  {id:'uhavvhitv9I', title:'Different worlds. One new adventure.', name:'One Evolving World', length:'44 SEC', poster:'one-evolving-world.jpg', description:'A fan-made “what if”: familiar heroes cross genres, bring their mechanics along, and build a shared world.'},
];

export default function VisionFilms(){
  const [active,setActive]=useState<string|null>(null);
  return <section className="vision-films" id="vision-films" aria-labelledby="films-title">
    <div className="story-section-heading"><div><span className="future-kicker">WATCH THE POSSIBILITY</span><h2 id="films-title">No final chapter.<br/>Just the next creator.</h2></div><p>Two short films about the future we’re working toward.<br/>AI-generated concepts, not gameplay or automatic remix features.</p></div>
    <div className="vision-film-grid">{films.map(f=><article className="vision-film" key={f.id}>
      <div className="vision-film-screen">{active===f.id ? <iframe src={`https://www.youtube-nocookie.com/embed/${f.id}?autoplay=1&rel=0`} title={`${f.name} — Game Commons AI concept film`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <button className="vision-film-poster" onClick={()=>setActive(f.id)} aria-label={`Watch ${f.name} (${f.length.toLowerCase()})`}><img src={`/films/${f.poster}`} width="1280" height="720" loading="lazy" alt={`${f.name}: AI-generated vision film poster`}/><span className="vision-film-play"><Play size={25} fill="currentColor"/> Watch film</span><span className="vision-film-length">{f.length}</span></button>}</div>
      <div className="vision-film-copy"><span className="future-kicker">{f.name}</span><h3>{f.title}</h3><p>{f.description}</p><a href={`https://www.youtube.com/watch?v=${f.id}`} target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></div>
    </article>)}</div>
    <div className="vision-film-handoff"><p><strong>Make the next chapter real.</strong> Take a playable remix, add your idea with your AI, and pass the source on with credit.</p><a className="future-primary" href="#real-remixes">Choose a remix <ArrowRight size={17}/></a><a className="future-link" href="/feedback">Bring your game <ArrowRight size={17}/></a></div>
    <p className="vision-film-note">Original robot and world in Pass It On. One Evolving World is an unofficial fan concept; no affiliation or endorsement. The playable collection uses projects with reuse permission. YouTube loads when you choose a film.</p>
  </section>;
}
