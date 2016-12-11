/*
function bcd2int ( arr )
{
	var uResult = 0;
	var ucTmp, iTmp1,iTmp2;

	for ( var i=0; i < arr.length; i++ )
	{
		ucTmp = arr [ i ];
		iTmp1 = ( ucTmp & 0xf0 ) >> 4;
		iTmp2 = ucTmp & 0x0f;
		uResult += ( iTmp1 * 10 + iTmp2 ) * parseInt ( Math.pow ( 100.0, parseInt ( arr.length - 1 - i ) ) );
	}

	return uResult;
}
*/

function bcd2number (bcd)
{
	var n = 0;
	var m = 1;
	for(var i = 0; i<bcd.length; i+=1) {
		n += (bcd[bcd.length-1-i] & 0x0F) * m;
		n += ((bcd[bcd.length-1-i]>>4) & 0x0F) * m * 10;
		m *= 100;
	}
	return n;
}

function number2bcd (number, size)
{
	var s = size || 4; //default value: 4
	var bcd = [];

	for ( var i = 0; i < s; i++ )
	{
		bcd.push ( 0 );
	}

	while(number !== 0 && s !== 0) {
		s-=1;
		bcd[s] = (number % 10);
		number = (number / 10)|0;
		bcd[s] += (number % 10) << 4;
		number = (number / 10)|0;
	}

	return bcd;
}