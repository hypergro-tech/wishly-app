// The names the song tests run, shared by run-suite.mjs (live backend) and
// local-suite.ts (same code on this Mac).
// who: the person the song is for. heard: what counts as the name said right.
export const CASES = [
  // Controls
  { id: 'emily', group: 'Everyday names', name: 'Emily', who: 'woman', heard: 'emily' },
  { id: 'michael', group: 'Everyday names', name: 'Michael', who: 'man', heard: 'michael' },
  // Tricky names with a tested spelling
  { id: 'siobhan', group: 'Tricky, tested spelling', name: 'Siobhan', who: 'woman', heard: 'siobh?an|shi?vau?wn|shi?von|shavon|chevonne?|shevaun|shivon' },
  { id: 'saoirse', group: 'Tricky, tested spelling', name: 'Saoirse', who: 'woman', heard: 'saoirse|seersh?a|searsha|sersha|seirsha' },
  { id: 'caoimhe', group: 'Tricky, tested spelling', name: 'Caoimhe', who: 'woman', heard: 'caoimhe|keeva|kiva|keva|keevah' },
  { id: 'rhys', group: 'Tricky, tested spelling', name: 'Rhys', who: 'man', heard: 'rhys|reese|reece|rees' },
  { id: 'sinead', group: 'Tricky, tested spelling', name: 'Sinéad', who: 'woman', heard: 'sin[eé]ad|shinn?ade|shinaid|shenade' },
  { id: 'aoife', group: 'Tricky, tested spelling', name: 'Aoife', who: 'woman', heard: 'aoife|eefa|eefah|ifa' },
  { id: 'hermione', group: 'Tricky, tested spelling', name: 'Hermione', who: 'woman', heard: 'hermione|her ?my ?o ?nee|hermyuhnee' },
  // Tricky names we haven't tested (Gemini suggests the spelling)
  { id: 'ailbhe', group: 'Tricky, not tested before', name: 'Ailbhe', who: 'woman', heard: 'ailbhe|alva|alvah|alvy' },
  { id: 'grainne', group: 'Tricky, not tested before', name: 'Gráinne', who: 'woman', heard: 'gr[aá]inne|grawn ?ya|granya|grania|grawnya' },
  { id: 'llewellyn', group: 'Tricky, not tested before', name: 'Llewellyn', who: 'man', heard: 'llewell?yn|lewell?yn|luwellin|lewelin|llewelyn' },
  { id: 'tadhg', group: 'Tricky, not tested before', name: 'Tadhg', who: 'man', heard: 'tadhg|tige|tieg|teague|taig|tyg' },
  { id: 'eoghan', group: 'Tricky, not tested before', name: 'Eoghan', who: 'man', heard: 'eoghan|owen|owain|oein|owan' },
  { id: 'oisin', group: 'Tricky, not tested before', name: 'Oisín', who: 'man', heard: 'ois[ií]n|osheen|usheen|ushin|oshin' },
  // Same name as a celebrity (the Neve-style refusal)
  { id: 'taylor', group: 'Shares a celebrity’s name', name: 'Taylor', who: 'woman', heard: 'taylor' },
  { id: 'selena', group: 'Shares a celebrity’s name', name: 'Selena', who: 'woman', heard: 'selena|salena' },
  { id: 'ariana', group: 'Shares a celebrity’s name', name: 'Ariana', who: 'woman', heard: 'ariann?a' },
  { id: 'harry', group: 'Shares a celebrity’s name', name: 'Harry', who: 'man', heard: 'harry' },
  // Unusual formats
  { id: 'marykate', group: 'Unusual formats', name: 'Mary Kate', who: 'woman', heard: 'mary[ -]?kate' },
  { id: 'annemarie', group: 'Unusual formats', name: 'Anne-Marie', who: 'woman', heard: 'ann?e?[ -]?marie' },
  { id: 'zoe', group: 'Unusual formats', name: 'Zoë', who: 'woman', heard: 'zo[eë]y?' },
  { id: 'jo', group: 'Unusual formats', name: 'Jo', who: 'woman', heard: 'jo|joe' },
  { id: 'maximilian', group: 'Unusual formats', name: 'Maximilian', who: 'man', heard: 'maximill?ian' },
  // What a buyer might type in the sounds-like box
  { id: 'saoirse_typed', group: 'Buyer typed a hyphenated spelling', name: 'Saoirse', sounds_like: 'SEER-sha', who: 'woman', heard: 'saoirse|seersh?a|searsha|sersha|seirsha' },
]
