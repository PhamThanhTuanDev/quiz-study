<?php

declare(strict_types=1);

/**
 * Tái tạo đúng thuật toán của Java (String.hashCode, java.util.Random, Collections.shuffle) để xáo phương án.
 *
 * Bản Spring Boot xáo phương án theo seed = hashCode("<mã lượt làm>:<id câu>"), nên tải lại trang vẫn đúng thứ tự cũ
 * mà không cần lưu thứ tự vào database. Bản PHP phải cho ra cùng thứ tự, để các lượt làm tạo từ bản Java
 * (đã có trong database hosting) vẫn hiện phương án như lúc bắt đầu làm.
 */

/** String.hashCode() của Java: tính trên đơn vị UTF-16, tràn số kiểu int 32 bit có dấu. */
function java_string_hash(string $text): int
{
    $hash = 0;
    $utf16 = mb_convert_encoding($text, 'UTF-16BE', 'UTF-8');
    for ($i = 0, $length = strlen($utf16); $i < $length; $i += 2) {
        $unit = (ord($utf16[$i]) << 8) | ord($utf16[$i + 1]);
        $hash = (31 * $hash + $unit) & 0xFFFFFFFF;
    }
    return $hash >= 0x80000000 ? $hash - 0x100000000 : $hash;
}

/** java.util.Random: bộ sinh đồng dư tuyến tính 48 bit. */
final class JavaRandom
{
    private const MULTIPLIER = 0x5DEECE66D;
    private const ADDEND = 0xB;
    private const MASK = (1 << 48) - 1;

    private int $seed;

    public function __construct(int $seed)
    {
        $this->seed = ($seed ^ self::MULTIPLIER) & self::MASK;
    }

    /** Random.nextInt(bound) (thuật toán cũ, Java vẫn giữ để tương thích). */
    public function nextInt(int $bound): int
    {
        $r = $this->next(31);
        $m = $bound - 1;
        if (($bound & $m) === 0) {
            return ($bound * $r) >> 31;
        }
        // Java: for (u = r; u - (r = u % bound) + m < 0; u = next(31)). "< 0" là phép cộng int bị tràn số.
        for ($u = $r; ($u - ($r = $u % $bound) + $m) > 0x7FFFFFFF; $u = $this->next(31)) {
        }
        return $r;
    }

    private function next(int $bits): int
    {
        $this->seed = (self::multiplyMod48($this->seed, self::MULTIPLIER) + self::ADDEND) & self::MASK;
        return $this->seed >> (48 - $bits);
    }

    /** (a * b) mod 2^48 không bị tràn int 64 bit của PHP: tách a thành hai nửa 24 bit. */
    private static function multiplyMod48(int $a, int $b): int
    {
        $high = $a >> 24;
        $low = $a & 0xFFFFFF;
        return (((($high * $b) & 0xFFFFFF) << 24) + $low * $b) & self::MASK;
    }
}

/**
 * Collections.shuffle(list, random) của Java.
 *
 * @template T
 * @param list<T> $items
 * @return list<T>
 */
function java_shuffle(array $items, JavaRandom $random): array
{
    for ($i = count($items); $i > 1; $i--) {
        $j = $random->nextInt($i);
        [$items[$i - 1], $items[$j]] = [$items[$j], $items[$i - 1]];
    }
    return $items;
}
