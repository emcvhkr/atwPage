var wsconnecter = new WebSocketConnectMethod({msgHandle:getJsonMessage,stateHandle:getConnState});
var recorder = new AudioRecordMethod();
var btnStart = document.getElementById('btnStart');
btnStart.onclick = start;
var btnStop = document.getElementById('btnStop');
btnStop.onclick = stop;
btnStop.disabled = true;
var btnClear = document.getElementById('btnClear');
btnClear.onclick = clear;

var ttaVarArea = document.getElementById('varArea');
var ttaResultArea = document.getElementById('resaultArea');

function getJsonMessage( jsonMsg ) {
	// console.log( "message: " + jsonMsg.data );
	var resultVar = JSON.parse(
		jsonMsg.data,
		function ( k, v ) {
			// console.log('k: ' + k );
			// 实时结果
			if ( k === 'var' ) {
				ttaVarArea.value = v;
			}
			// 最终结果
			if ( k === 'rec' ) {
				ttaResultArea.value += v + '\r\n';
			}
		}
	);
}

function getConnState( connState ) {
	if ( connState === 0 ) {
		console.log( 'connection open' );
		recorder.startRec(
			function(oneData) {
				wsconnecter.wsSend(oneData);
			}
		);
	} else if ( connState === 1 ) {
		recorder.stopRec();
		console.log( 'connection close' );
	} else if ( connState === 2 ) {
		recorder.stopRec();
		console.log( 'connecttion error' );
	}
}

function start() {
	btnStart.disabled = true;
	btnStop.disabled = false;
	wsconnecter.wsStart( getJsonMessage );
}

function stop() {
	btnStart.disabled = false;
	btnStop.disabled = true;
	recorder.stopRec();
	wsconnecter.wsStop();
}

function clear() {
	ttaVarArea.value = '';
	ttaResultArea.value = '';
}

function wait(milliSeconds) {
	var waitPos = new Date().getTime();
	while (new Date().getTime() < waitPos + milliSeconds) {

	}
}