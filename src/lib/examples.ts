export interface Example {
  code: string;
  tests: string;
}

export const EXAMPLES: Record<string, Example> = {
  hello: {
    code: `; Hello World - store ASCII values in memory
    ORG 0x0000

    LD DE, 0x8000   ; destination address
    LD HL, msg      ; source address
    LD BC, 13       ; byte count
    LDIR            ; block copy HL→DE
    HALT

msg:
    DB "Hello, World!", 0
`,
    tests: `; Check first few characters in memory
assert mem[0x8000] == 0x48  ; 'H'
assert mem[0x8001] == 0x65  ; 'e'
assert mem[0x8002] == 0x6C  ; 'l'
assert mem[0x8003] == 0x6C  ; 'l'
assert mem[0x8004] == 0x6F  ; 'o'
assert BC == 0x0000          ; LDIR exhausted BC
`,
  },

  loop: {
    code: `; Sum numbers 1..10 using DJNZ loop
    ORG 0x0000

    LD A, 0         ; accumulator = 0
    LD B, 10        ; loop counter

LOOP:
    ADD A, B        ; A += B
    DJNZ LOOP       ; B--, jump if not zero

    LD (0x8000), A  ; store result
    HALT
`,
    tests: `; 1+2+...+10 = 55 = 0x37
assert A == 55
assert mem[0x8000] == 55
assert B == 0
`,
  },

  fibonacci: {
    code: `; Compute first 10 Fibonacci numbers into RAM at 0x8000
    ORG 0x0000

    LD HL, 0x8000   ; output pointer
    LD B, 10        ; count

    LD D, 0         ; D = prev (F(0))
    LD E, 1         ; E = curr (F(1))

FIB_LOOP:
    LD (HL), D      ; store current value
    INC HL

    LD A, D         ; A = prev
    ADD A, E        ; A = prev + curr
    LD D, E         ; prev = curr
    LD E, A         ; curr = prev + curr

    DJNZ FIB_LOOP

    HALT
`,
    tests: `; Fibonacci: 0,1,1,2,3,5,8,13,21,34
assert mem[0x8000] == 0
assert mem[0x8001] == 1
assert mem[0x8002] == 1
assert mem[0x8003] == 2
assert mem[0x8004] == 3
assert mem[0x8005] == 5
assert mem[0x8006] == 8
assert mem[0x8007] == 13
assert mem[0x8008] == 21
assert mem[0x8009] == 34
`,
  },

  sort: {
    code: `; Bubble sort - sort 8 bytes at 0x8000
    ORG 0x0000

    ; Initialize unsorted data
    LD HL, data
    LD DE, 0x8000
    LD BC, 8
    LDIR

    ; Bubble sort
    LD B, 7         ; outer loop count

OUTER:
    PUSH BC
    LD HL, 0x8000
    LD B, 7         ; inner loop count

INNER:
    LD A, (HL)
    INC HL
    LD C, (HL)      ; C = next byte
    CP C            ; compare A with C
    JR C, NO_SWAP   ; jump if A < C (already ordered)
    JR Z, NO_SWAP
    ; Swap
    LD (HL), A
    DEC HL
    LD (HL), C
    INC HL

NO_SWAP:
    DJNZ INNER

    POP BC
    DJNZ OUTER

    HALT

data:
    DB 5, 3, 8, 1, 9, 2, 7, 4
`,
    tests: `; Should be sorted ascending: 1,2,3,4,5,7,8,9
assert mem[0x8000] == 1
assert mem[0x8001] == 2
assert mem[0x8002] == 3
assert mem[0x8003] == 4
assert mem[0x8004] == 5
assert mem[0x8005] == 7
assert mem[0x8006] == 8
assert mem[0x8007] == 9
`,
  },
};
