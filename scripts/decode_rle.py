#!/usr/bin/env python3
"""
Простой декодер RLE в формате: буква + число (количество повторов).
Читает входную строку из файла (путь передан как первый аргумент) или из stdin.
Выводит восстановленный текст в stdout (или в файл, если передан второй аргумент).

Пример:
  echo a3b4c2e10b1 | python3 scripts/decode_rle.py
  # -> aaabbbbcc eeeeeeeeee b

В исходном тексте нет цифр, поэтому код однозначно интерпретируем.
"""
import sys


def decode_rle(s: str) -> str:
    s = s.strip()
    if not s:
        return ''
    out_parts = []
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        # Ожидаем, что символ — не цифра
        if ch.isdigit():
            # Пропустим некорректный ввод: сдвинемся дальше
            i += 1
            continue
        i += 1
        # Собираем многозначное число (количество повторов)
        num_chars = []
        while i < n and s[i].isdigit():
            num_chars.append(s[i])
            i += 1
        count = int(''.join(num_chars)) if num_chars else 1
        if count > 0:
            out_parts.append(ch * count)
    return ''.join(out_parts)


def main(argv):
    infile = None
    outfile = None
    if len(argv) >= 2:
        infile = argv[1]
    if len(argv) >= 3:
        outfile = argv[2]

    if infile:
        with open(infile, 'r', encoding='utf-8') as f:
            data = f.read()
    else:
        data = sys.stdin.read()

    data = data.strip().splitlines()[0] if data else ''
    decoded = decode_rle(data)

    if outfile:
        with open(outfile, 'w', encoding='utf-8') as f:
            f.write(decoded)
        print(f'Wrote {len(decoded)} bytes to {outfile}')
    else:
        sys.stdout.write(decoded)


if __name__ == '__main__':
    main(sys.argv)
