

function GenerateRandomCharacters(type, len) {
    /**
    * Generate a string with random characters
    * 
    * @method
    * @param {string} type	u = Only upper case characters, l = Only lower case characters, n = only numbers, ns = only numbers with sign
    *                       m = A mix of upper, lower case characters and numbers, mc = A mix of upper, lower case characters.
    * @param {number} len	string length
    * @return {string}		the string with random characters
    */

    var randomstring = '';

    if (isNaN(len) || type == undefined || type.length < 1)
        return randomstring;

    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXTZ",
        nums = "0123456789",
        buffType = type.toLowerCase(),
        allowedChars = "",
        allowedCharsLength;


    switch (buffType) {
        case "m":
            allowedChars += nums;
        case "mc":
            allowedChars += chars.toLowerCase(); ;
        case "u":
            allowedChars += chars;
            break;
        case "l":
            allowedChars += chars.toLowerCase();
            break;
        case "ns":
        case "n":
            allowedChars += nums;
            break;

    }

    allowedCharsLength = allowedChars.length;
    var rndVal;
    for (var i = 0; i < len; i++) {
        rndVal = Math.floor(Math.random() * allowedCharsLength);
        randomstring += allowedChars.charAt(rndVal);
    }

    if ((buffType == "ns") && (rndVal % 2 == 1)) {
        randomstring = '-' + randomstring;
    }

    return randomstring;
}

function GenerateStockSymbol() {
    return GenerateRandomCharacters("u", 3);
}
function GenerateRandomValue() {
    return (Math.floor(Math.random() * 1000) / 10).toString();
}

function GenerateStockData(columnsNumber, rowsNumber) {
    var cols = parseInt(columnsNumber),
        rows = parseInt(rowsNumber),
        retVal = [];

    if (isNaN(cols) || isNaN(rows) || cols< 1 || rows < 1)
        return retVal;

    var colsCount, currentRow;

    // Add the stock symbol
    for (var rowsCount = 0; rowsCount < rowsNumber; rowsCount++) {
        
        currentRow = new Array();
        
        // Generate the stock symbol in the first column
        currentRow.push(GenerateStockSymbol());

        for (colsCount = 1; colsCount < columnsNumber; colsCount++) {
            currentRow.push(GenerateRandomValue());
        }
        retVal.push(currentRow);
    }

    return retVal;
}