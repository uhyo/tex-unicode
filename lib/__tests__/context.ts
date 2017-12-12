import {
    BlockContext,
    CommandContext,
    SupContext,
    SubContext,
    GlobalContext,
    SourceBuf,
} from '../context';

function makeBuf(value: string, cursorPosition = 0, inputPosition = 0): SourceBuf {
    return {
        value,
        inputPosition,
        originalCursorPosition: cursorPosition,
        cursorPosition,
    };
}

describe('CommandContext', ()=>{
    let ctx: CommandContext;
    beforeEach(()=> {
        ctx = new CommandContext();
    });

    it('replaces simple command', ()=>{
        const buf = makeBuf('\\alpha foo');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
        });
        expect(buf).toEqual({
            value: '\\alpha foo',
            inputPosition: 6,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('α');
    });
    it('moves cursor position', ()=>{
        const buf = makeBuf('\\xi_1', 5);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
        });
        expect(buf).toEqual({
            value: '\\xi_1',
            inputPosition: 3,
            originalCursorPosition: 5,
            cursorPosition: 3,
        });
        expect(ctx.value).toBe('ξ');
    });
    it('consumes one trailing space', ()=>{
        const buf = makeBuf('\\beta   foo', 6);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
        });
        expect(buf).toEqual({
            value: '\\beta   foo',
            inputPosition: 6,
            originalCursorPosition: 6,
            cursorPosition: 1,
        });
        expect(ctx.value).toBe('β');
    });
    it('only accepts simple commands at start position', ()=>{
        const buf = makeBuf('foo\\alpha');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: false,
            changed: false,
        });
        expect(buf).toEqual({
            value: 'foo\\alpha',
            inputPosition: 0,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
    });
    it('rejects undefined command', ()=>{
        const buf = makeBuf('\\ababa foo', 8);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: false,
            changed: false,
        });
        expect(buf).toEqual({
            value: '\\ababa foo',
            inputPosition: 0,
            originalCursorPosition: 8,
            cursorPosition: 8,
        });
    });
    describe('single-character modifiers', ()=>{
        it('acute', ()=>{
            const buf = makeBuf(`\\'abc`, 4);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: `\\'abc`,
                inputPosition: 3,
                originalCursorPosition: 4,
                cursorPosition: 2,
            });
            expect(ctx.value).toBe('á');
        });
        it('grave', ()=>{
            const buf = makeBuf('\\`o k', 3);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\`o k',
                inputPosition: 3,
                originalCursorPosition: 3,
                cursorPosition: 1,
            });
            expect(ctx.value).toBe('ò');
        });
        it('circumflex', ()=>{
            const buf = makeBuf('\\^h', 2);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\^h',
                inputPosition: 3,
                originalCursorPosition: 2,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ĥ');
        });
        it('trema', ()=>{
            const buf = makeBuf('\\"e123', 4);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\"e123',
                inputPosition: 3,
                originalCursorPosition: 4,
                cursorPosition: 2,
            });
            expect(ctx.value).toBe('ë');
        });
        it('tilde', ()=>{
            const buf = makeBuf('\\~iii');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\~iii',
                inputPosition: 3,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ĩ');
        });
        it('macron', ()=>{
            const buf = makeBuf('\\=g');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\=g',
                inputPosition: 3,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ḡ');
        });
        it('dot', ()=>{
            const buf = makeBuf('\\.I');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\.I',
                inputPosition: 3,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('İ');
        });
    });
    describe('block-form modifiers', ()=>{
        it('mathbf', ()=>{
            const buf = makeBuf('\\mathbf{Bar123}_2', 17);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathbf{Bar123}_2',
                inputPosition: 15,
                originalCursorPosition: 17,
                cursorPosition: 14, // bold characters are of length 2
            });
            expect(ctx.value).toBe('𝐁𝐚𝐫𝟏𝟐𝟑');
        });
        it('mathit', ()=>{
            const buf = makeBuf('\\mathit{Arith}hello', 14);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathit{Arith}hello',
                inputPosition: 14,
                originalCursorPosition: 14,
                cursorPosition: 9,
            });
            expect(ctx.value).toBe('𝐴𝑟𝑖𝑡ℎ');
        });
        it('mathbfit', ()=>{
            const buf = makeBuf('\\mathbfit{Proj}_1', 0);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathbfit{Proj}_1',
                inputPosition: 15,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝑷𝒓𝒐𝒋');
        });
        it('mathscr', ()=>{
            const buf = makeBuf('\\mathscr{Hello}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathscr{Hello}',
                inputPosition: 15,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ℋℯ𝓁𝓁ℴ');
        });
        it('mathcal', ()=>{
            const buf = makeBuf('\\mathcal{AAA}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathcal{AAA}',
                inputPosition: 13,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝓐𝓐𝓐');
        });
        it('mathfrak', ()=>{
            const buf = makeBuf('\\mathfrak{Greek}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathfrak{Greek}',
                inputPosition: 16,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝔊𝔯𝔢𝔢𝔨');
        });
        it('mathbb', ()=>{
            const buf = makeBuf('\\mathbb{FooあいうNQ}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathbb{FooあいうNQ}',
                inputPosition: 17,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝔽𝕠𝕠あいうℕℚ');
        });
        it('mathsf', ()=>{
            const buf = makeBuf('\\mathsf{printf}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathsf{printf}',
                inputPosition: 15,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝗉𝗋𝗂𝗇𝗍𝖿');
        });
        it('mathsfbf', ()=>{
            const buf = makeBuf('\\mathsfbf{error}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathsfbf{error}',
                inputPosition: 16,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝗲𝗿𝗿𝗼𝗿');
        });
        it('mathsfit', ()=>{
            const buf = makeBuf('\\mathsfit{error}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathsfit{error}',
                inputPosition: 16,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝘦𝘳𝘳𝘰𝘳');
        });
        it('mathsfbfit', ()=>{
            const buf = makeBuf('\\mathsfbfit{error}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathsfbfit{error}',
                inputPosition: 18,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝙚𝙧𝙧𝙤𝙧');
        });
        it('mathtt', ()=>{
            const buf = makeBuf('\\mathtt{printf}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\mathtt{printf}',
                inputPosition: 15,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('𝚙𝚛𝚒𝚗𝚝𝚏');
        });
        it('single-character', ()=>{
            const buf = makeBuf('\\"{oui}', 7);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\"{oui}',
                inputPosition: 7,
                originalCursorPosition: 7,
                cursorPosition: 3,
            });
            expect(ctx.value).toBe('öui');
        });
        it('u (breve) modifier', ()=>{
            const buf = makeBuf('\\u{unicode}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\u{unicode}',
                inputPosition: 11,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ŭnicode');
        });
        it('v (caron) modifier', ()=>{
            const buf = makeBuf('\\v{c}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\v{c}',
                inputPosition: 5,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('č');
        });
        it('H (double acute) modifier', ()=>{
            const buf = makeBuf('\\H{o}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\H{o}',
                inputPosition: 5,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ő');
        });
        it('c (cedilla) modifier', ()=>{
            const buf = makeBuf('\\c{C}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\c{C}',
                inputPosition: 5,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('Ç');
        });
        it('d (dot below) modifier', ()=>{
            const buf = makeBuf('\\d{m}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\d{m}',
                inputPosition: 5,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ṃ');
        });
        it('r (ring) modifier', ()=>{
            const buf = makeBuf('\\r{a}');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: true,
            });
            expect(buf).toEqual({
                value: '\\r{a}',
                inputPosition: 5,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('å');
        });
        it('leave unmodifiable character', ()=>{
            const buf = makeBuf('\\"{ゆ}abc');

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: false,
            });
            expect(buf).toEqual({
                value: '\\"{ゆ}abc',
                inputPosition: 5,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('ゆ');
        });
        it('ignore unclosed block', ()=>{
            const buf = makeBuf('\\mathbf{abc', 11);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: false,
            });
            expect(buf).toEqual({
                value: '\\mathbf{abc',
                inputPosition: 11,
                originalCursorPosition: 11,
                cursorPosition: 11,
            });
            expect(ctx.value).toBe('\\mathbf{abc');
        });
        it('ignore unclosed block (modifier)', ()=>{
            const buf = makeBuf('\\`{abc', 0);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: true,
                changed: false,
            });
            expect(buf).toEqual({
                value: '\\`{abc',
                inputPosition: 6,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('\\`{abc');
        });
        it('reject non-block command', ()=>{
            const buf = makeBuf('\\mathbf abc', 11);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: false,
                changed: false,
            });
            expect(buf).toEqual({
                value: '\\mathbf abc',
                inputPosition: 0,
                originalCursorPosition: 11,
                cursorPosition: 11,
            });
            expect(ctx.value).toBe('');
        });
        it('reject non-block command (modifier)', ()=>{
            const buf = makeBuf('\\u a', 0);

            const ret = ctx.consume(buf);
            expect(ret).toEqual({
                consumed: false,
                changed: false,
            });
            expect(buf).toEqual({
                value: '\\u a',
                inputPosition: 0,
                originalCursorPosition: 0,
                cursorPosition: 0,
            });
            expect(ctx.value).toBe('');
        });
    });
});

describe('SupContext', ()=>{
    let ctx: SupContext;
    beforeEach(()=> {
        ctx = new SupContext();
    });
    it('converts single char', ()=>{
        const buf = makeBuf('345', 2);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
        });
        expect(buf).toEqual({
            value: '345',
            inputPosition: 1,
            originalCursorPosition: 2,
            cursorPosition: 2,
        });
        expect(ctx.value).toBe('³');
    });
    it('processes command at sup position', ()=>{
        const buf = makeBuf('3^\\mathbf{ABC}', 14, 2);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
        });
        expect(buf).toEqual({
            value: '3^\\mathbf{ABC}',
            inputPosition: 14,
            originalCursorPosition: 14,
            cursorPosition: 8,
        });
        expect(ctx.value).toBe('𝐀𝐁𝐂');
    });
    it('accepts block', ()=>{
        const buf = makeBuf('{123あいう}', 8);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
        });
        expect(buf).toEqual({
            value: '{123あいう}',
            inputPosition: 8,
            originalCursorPosition: 8,
            cursorPosition: 6,
        });
        expect(ctx.value).toBe('¹²³あいう');
    });
    it('handles end of input', ()=>{
        const buf = makeBuf('X^', 2, 2);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: false,
            changed: false,
        });
        expect(buf).toEqual({
            value: 'X^',
            inputPosition: 2,
            originalCursorPosition: 2,
            cursorPosition: 2,
        });
        expect(ctx.value).toBe('^');
    });
    it('rejects inconvertible char', ()=>{
        const buf = makeBuf('わ', 0);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: false,
            changed: false,
        });
        expect(buf).toEqual({
            value: 'わ',
            inputPosition: 0,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('^');
    });
    it('ignores non-command backslash', ()=>{
        const buf = makeBuf('a^\\3', 0, 2);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: false,
        });
        expect(buf).toEqual({
            value: 'a^\\3',
            inputPosition: 3,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('^\\');
    });
    it('ignores non-closing block', ()=>{
        const buf = makeBuf('a^{foooo', 2, 2);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: false,
        });
        expect(buf).toEqual({
            value: 'a^{foooo',
            inputPosition: 8,
            originalCursorPosition: 2,
            cursorPosition: 2,
        });
        expect(ctx.value).toBe('^{foooo');
    });
});

describe('SubContext', ()=>{
    let ctx: SubContext;
    beforeEach(()=> {
        ctx = new SubContext();
    });
    it('converts single char', ()=>{
        const buf = makeBuf('a_xyz', 3, 2);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
        });
        expect(buf).toEqual({
            value: 'a_xyz',
            inputPosition: 3,
            originalCursorPosition: 3,
            cursorPosition: 3,
        });
        expect(ctx.value).toBe('ₓ');
    });
});

describe('GlobalContext', ()=>{
    let ctx: GlobalContext;
    beforeEach(()=> {
        ctx = new GlobalContext();
    });
    it('performs nothing to plain text', ()=>{
        const buf = makeBuf('foobar');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: false,
            blockComplete: false,
        });
        expect(ctx.value).toBe('foobar');
    });
    it('processes command', ()=>{
        const buf = makeBuf('foo\\mathbf{bar}ba\\mathit{z}');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: 'foo\\mathbf{bar}ba\\mathit{z}',
            inputPosition: 27,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('foo𝐛𝐚𝐫ba𝑧');
    });
    it('ignores undefined command', ()=>{
        const buf = makeBuf('foo\\foo{bar}ba\\mathit{z}');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: 'foo\\foo{bar}ba\\mathit{z}',
            inputPosition: 24,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('foo\\foo{bar}ba𝑧');
    });
    it('processes sup command', ()=>{
        const buf = makeBuf('i^3');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: 'i^3',
            inputPosition: 3,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('i³');
    });
    it('processes sup command after command', ()=>{
        const buf = makeBuf('\\"i^3', 5);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: '\\"i^3',
            inputPosition: 5,
            originalCursorPosition: 5,
            cursorPosition: 2,
        });
        expect(ctx.value).toBe('ï³');
    });
    it('processes command at sup position', ()=>{
        const buf = makeBuf('3^\\mathbf{a}+2', 14);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: '3^\\mathbf{a}+2',
            inputPosition: 14,
            originalCursorPosition: 14,
            cursorPosition: 5,
        });
        expect(ctx.value).toBe('3𝐚+2');
    });
    it('processes sub command', ()=>{
        const buf = makeBuf('A_9');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: 'A_9',
            inputPosition: 3,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('A₉');
    });
    it('processes sub command after command', ()=>{
        const buf = makeBuf('\\mathbf{Z}_1');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: '\\mathbf{Z}_1',
            inputPosition: 12,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('𝐙₁');
    });
    it('processes sub command block', ()=>{
        const buf = makeBuf('\\mathbf{Z}_{123}', 16);

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: '\\mathbf{Z}_{123}',
            inputPosition: 16,
            originalCursorPosition: 16,
            cursorPosition: 5,
        });
        expect(ctx.value).toBe('𝐙₁₂₃');
    });
    it('ignores unmatched right bracket', ()=>{
        const buf = makeBuf('a^b}5');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: true,
            blockComplete: false,
        });
        expect(buf).toEqual({
            value: 'a^b}5',
            inputPosition: 5,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('aᵇ}5');
    });
});

describe('BlockContext', ()=> {
    let ctx: BlockContext;
    beforeEach(()=> {
        ctx = new BlockContext();
    });
    it('does nothing to plain text', ()=> {
        const buf = makeBuf('foobar');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: false,
            blockComplete: false,
        });
        expect(ctx.value).toBe('foobar');
    });
    it('stops at block end ', ()=> {
        const buf = makeBuf('foobar}あいう');

        const ret = ctx.consume(buf);
        expect(ret).toEqual({
            consumed: true,
            changed: false,
            blockComplete: true,
        });
        expect(buf).toEqual({
            value: 'foobar}あいう',
            inputPosition: 7,
            originalCursorPosition: 0,
            cursorPosition: 0,
        });
        expect(ctx.value).toBe('foobar');
    });
});
