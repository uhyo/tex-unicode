import {
    runReplace,
} from '../replacement';

describe('replacement', ()=>{
    it('performs nothing to plain text', ()=>{
        const ret = runReplace('foobar', 6);
        expect(ret).toEqual({
            value: 'foobar',
            position: 6,
            changed: false,
        });
    });
    it('processes command', ()=>{
        const ret = runReplace('foo\\mathbf{bar}ba\\mathit{z}', 0);
        expect(ret).toEqual({
            value: 'foo𝐛𝐚𝐫ba𝑧',
            changed: true,
            position: 0,
        });
    });
    it('nested', ()=>{
        const ret = runReplace('foo\\mathbf{ba\\mathit{z}r}ba', 27);
        expect(ret).toEqual({
            value: 'foo𝐛𝐚𝑧𝐫ba',
            changed: true,
            position: 13,
        });
    });
});
