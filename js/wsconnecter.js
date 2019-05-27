function WebSocketConnectMethod( config ) {
	
	var ProductId = "278578838";
	var ApiKey = "112466dbae1b448f9838b707dc4598af";
	var Uri = "wss://asr.dui.ai/runtime/v2/recognize?" +
			  "productId=" + ProductId + "&" +
              "apikey=" + ApiKey + "&" +
              "enableNumberConvert=false" + "&" +
              "enablePunctuation=false" + "&" +
              "res=aimedical";
	var speechSokt;
	var connKeeperID;
	
	var msgHandle = config.msgHandle;
	var stateHandle = config.stateHandle;
			  
	this.wsStart = function ( callBack ) {
		
		msgHandle = callBack;
		
		if ( 'WebSocket' in window ) {
			speechSokt = new WebSocket( Uri );
			speechSokt.onopen = function(e){onOpen(e);};
			speechSokt.onclose = function(e){onClose(e);};
			speechSokt.onmessage = function(e){onMessage(e);};
			speechSokt.onerror = function(e){onError(e);};
		}
		else {
			console.log('当前浏览器不支持 WebSocket');
		}
	};
	
	this.wsStop = function () {
		speechSokt.close();
		window.clearInterval( connKeeperID );
		speechSokt = undefined;
	};
	
	this.wsSend = function ( oneData ) {
		if ( speechSokt.readyState === 1 ) { // 0:CONNECTING, 1:OPEN, 2:CLOSING, 3:CLOSED
			speechSokt.send( oneData );
		}
	};
	
	function onOpen( e ) {
		// console.log( 'connection open: ' + e.toString() );
		sendRequest();
		connKeeperID = window.setInterval( connKeeper, 5000 );
		stateHandle(0);
	}
	
	function onClose( e ) {
		// console.log( 'connection close: ' + e.code );
		window.clearInterval( connKeeperID );
		speechSokt = undefined;
		stateHandle(1);
	}
	
	function onMessage( e ) {
		msgHandle( e );
	}
	
	function onError( e ) {
		// console.log( 'connecttion error : ' + e );
		window.clearInterval( connKeeperID );
		speechSokt = undefined;
		stateHandle(2);
	}
			  
	function sendRequest() {	
		var requestJson = {
			context: {
				productId: ProductId,
				userId: "",
				deviceName: "",
				sdkName: ""
			},
			request: {
				requestId: getUUID(32),
				audio: {
					audioType: "wav",
					sampleBytes: 2,
					sampleRate: 16000,
					channel: 1
				},
				asr: {
					wakeupWord: "",
					enableRealTimeFeedback: true,
					enableVAD: true,
					enablePunctuation: true,
					language: "zh-CN",
					res: "aimedical",
					lmId: "",
					enableNumberConvert: true
				}
			}
		};
			
		// 发送 requestStr
		var requestStr = JSON.stringify( requestJson );
		// console.log( requestStr );
		speechSokt.send( requestStr );
	}
	
	function getUUID( len, range ) {
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
		var uuid = [], i;
		range = range || 62;
	 
		if ( len ) {
			// Compact form
			for ( i = 0; i < len; i++ ) {
				var pos = 0 | Math.random()*range;
				uuid[i] = chars[ pos ];
			}
		} 
		
		//console.log('uuid: ' + uuid.join(''));
		
		return uuid.join('');
	}

	function connKeeper() {
		var beatsData = new ArrayBuffer(3016);
		speechSokt.send( beatsData );
	}
}
