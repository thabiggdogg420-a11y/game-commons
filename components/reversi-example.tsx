import {reversiExample} from '@/lib/reversi-example';
export function ReversiExample({projectId}:{projectId:string}){
 if(projectId!==reversiExample.projectId)return null;
 return <aside aria-label="Separate Reversi remix example">
  <p><strong>A playable remix of this original</strong><br/>Assistant-authored example—not an outside creator contribution or upstream endorsement.</p>
  <p>Try a short match: choose <strong>Two Players → 12</strong> total placements. Unlimited is the default; more discs wins at the limit.</p>
  <p><a data-usage="start" href={reversiExample.playUrl}>Play the move-limit remix ↗</a><br/><a href={reversiExample.sourceUrl}>Get remix source + rebuild guide ↗</a><br/><a href={reversiExample.returnUrl}>Return your own remix for private review →</a></p>
  <details><summary>Tested scope, credits and return limits</summary>
   <p>Desktop hotseat-12 gameplay and restart/replay/pause/cancel/session reset checked; live launch and one legal placement observed. CPU, complete 24/unlimited games, mobile touch, keyboard-only board play, audio and full network behavior remain unverified. The Hub wrapper is configured silent and session-only.</p>
   <p>Original: Regi Ellis (MIT). Keep the original MIT notice, Kenney CC0 sound notice, Bungee SIL OFL font notice and Godot engine notices. The game-source guide and Hub wrapper hosting are separate.</p>
   <p>For your adaptation, include public source/build links, exact parents, credits, code/asset terms and actual tests. Return is manual private review—not automatic publication. This example does not increase the original-game count.</p>
  </details>
 </aside>;
}
