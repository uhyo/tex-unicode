
export const symbolTable = {
    'alpha': 'α',
};

export function lookupSymbol(name: string): string | undefined{
    return symbolTable[name];
}
