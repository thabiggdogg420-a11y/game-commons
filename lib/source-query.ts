const CONNECTIVE_WORDS=new Set('a an and are as at be by can could do for from game games how i in into is it like me my of on or please that the their this to want with would'.split(' '));
export function sourceQueryTerms(query:string){return [...new Set((query.normalize('NFKC').toLowerCase().slice(0,200).match(/[\p{L}\p{N}]+/gu)??[]).filter(word=>!CONNECTIVE_WORDS.has(word)))];}
