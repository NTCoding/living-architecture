# published-language-enumeration

## Purpose
A readonly runtime enumeration of the complete values in a published language concept. The corresponding compile time union is derived from this enumeration so consumers receive one type safe source of truth.

## Behavioral Contract
1. Declared as a constant readonly tuple
2. Contains the complete runtime values for one published language concept
3. Uses an uppercase name
4. Has no behavior
5. Provides the source for its corresponding published language union

## Anti-Patterns
- Do not duplicate values already defined by another enumeration
- Do not use an enumeration for open ended values
- Do not put a runtime enumeration on a value object that represents one value
