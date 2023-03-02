import csv
import re
import json

def main():
    dictList = []
    with open('Detail1.csv', newline='') as csvfile:
        reader = csv.reader(csvfile, delimiter=',', quotechar='"')
        counter = 0
        for row in reader:
            processedRow = process_row(row)
            if row[2] != "A" or len(processedRow) != 8: # Hard limit of 8 on sequence length
                continue
            else:
                tempDict = {'name': row[1], "structure": processedRow}
                dictList.append(tempDict)
                counter = counter + 1

    with open('oneill.csv', newline='') as csvfile:
        reader = csv.reader(csvfile, delimiter=',', quotechar='"')
        for row in reader:
            for dict in dictList:
                if dict['name'] == row[1]:
                    dict['name'] = row[3]

    jsonString = json.dumps(dictList)
    jsonFile = open("data.json", "w")
    jsonFile.write(jsonString)
    jsonFile.close()
    print(counter)

def process_row(row):
    """Process a row: split by punctuation, discard empty parts,
    and split into individual bar symbols."""
    
    # print("row", row)
    s = row[3]
    #print("s", s)
    s = re.split('\.|,|;| ', s)
    #print("after split", s)
    s = [si for si in s if len(si)]
    #print("after comp", s)
    s = sum([process_chunk(si) for si in s], start=[])
    #print("after chunks")
    return s


def process_chunk(c):
    """Given a string containing bar symbols, separate them to a list.
    Most bar symbols are just lowercase letters, but they can contain
    an uppercase prefix (indicating part), and/or a '1' suffix
    (indicating variation)

    >>> process_chunk("ab1")
    ['a', 'b1']
    >>> process_chunk("Aab1")
    ['Aa', 'b1']
    >>> process_chunk("AaAb1")
    ['Aa', 'Ab1']
    """
    
    res = []
    i = 0
    while i < len(c):
        end = i+1
        if c[i].isupper():
            end = end+1
        if end < len(c) and c[end].isdigit():
            end = end+1
        res.append(c[i:end])
        i = end
    return res

main()
 