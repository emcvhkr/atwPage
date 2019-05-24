function AudioRecordMethod( config ) {
	config = config || {};
	
	var audioContext;	// 音频环境对象 audioContex
	var audioNode;	// 声音缓存对象 audioNode
	var audioSource;	// 声音输入对象 audioSource
	var audioStream;	// 数据流 audioStream
	
	var audioBufferSize = config.audioBufferSize || 4096;	// 一次缓存大小
	var audioSampleBits = config.audioSampleBits || 16;		// 采样数位
	var audioSampleRate = config.audioSampleRate || 44100;	// 采样率
	var audioDSampleRate = config.desiredSampleRate || 16000;
	var audioChannelNum = config.audioChannelNum || 1;		// 通道数
	
	var recording = false;
	
	var sendBuffer; // 发送缓存
	var sendHandle;
	
	// 开始录制
	this.startRec = function( sendCallback ) {
		sendHandle = sendCallback;
		// 实例化 audiContext
		audioContext = new ( window.AudioContext || window.webkitAudioContext )();
		
		// 实例化 audioNode
		if ( audioContext.createJavaScriptNode ) {
			audioNode = audioContext.createJavaScriptNode( audioBufferSize, audioChannelNum, audioChannelNum );
		} else if ( audioContext.createScriptProcessor ) {
			audioNode = audioContext.createScriptProcessor( audioBufferSize, audioChannelNum, audioChannelNum );
		} else {
			console.log('当前浏览器不支持 WebAudio API');
		}
		audioNode.connect( audioContext.destination );
		
		// 获取硬件
		if ( navigator.mediaDevices.getUserMedia ) {
			navigator.mediaDevices.getUserMedia( { audio:true } ) // constraints
			.then( onCaptureSuccess ) // onSuccess
			.catch( onCaptureError ); // onError
		}		
	};
	
	// 停止录制
	this.stopRec = function() {
		console.log( 'stopRec' );
		
		// stop recording
		recording = false;
		
		// to make sure onaudioprocess stops firing
		audioSource.disconnect();
		audioNode.disconnect();
		
		clearRecordedData();
	};
	
	// 硬件获取成功
	function onCaptureSuccess( stream ) {
		console.log('onCaptureSuccess');
		
		audioStream = stream;
		
		// 实例化 audioSource
		audioSource = audioContext.createMediaStreamSource( stream );
		audioSource.connect( audioNode );
		
		// 绑定数据接收函数
		audioNode.onaudioprocess = onDataComing;
		
		recording = true;
	}
	
	// 硬件获取失败
	function onCaptureError( error ) {
		console.log( 'The following gUM error occured::' + 
		'\n error.name: ' + error.name + 
		'\n error.message: ' + error.message );
	}
	
	// 有采样数据时
	function onDataComing( e ) {
		// 若数据流非活跃则进行处理
		if ( isMediaStreamActive() === false ) {
			console.log( '媒体设备似乎停止运行了...' );
			
			// 处理操作，关闭录音，断开识别服务等
		}
		
		// 是否在录音
		if ( !recording ) {
			return;
		}
		
		// 获得采样
		var leftSample = e.inputBuffer.getChannelData(0);
		sendBuffer = new Float64Array( leftSample ); // 得到一帧数据
		
		var finalData = getWavData({
				channelNum: audioChannelNum,
				sampleRate: audioSampleRate,
				desiredSampleRate: audioDSampleRate,
				oneData: sendBuffer
			});
		
		sendHandle( finalData );
		//console.log( 'finalData Length: ' + finalData.byteLength + finalData.toString() );
	}
	
	// 判断数据流是否活跃
	function isMediaStreamActive() {
		if ( 'active' in audioStream ) {
			if ( !audioStream.active ) {
				return false;
			}
		} else if ( 'ended' in audioStream ) {
			if ( audioStream.ended ) {
				return false;
			}
		}
		
		return true;
	}

	// 得到 wav 数据
	function getWavData( config ) {
		// console.log('getWavData');
		var channelNum = config.channelNum;	
		var sampleRate = config.sampleRate;
		var desiredSampleRate = config.desiredSampleRate;
		var oneData = config.oneData;
		
		// console.log('channelNum: ' + channelNum + '\n' +
		// 					'sampleRate: ' + sampleRate + '\n' +
		// 					'desiredSampleRate: ' + desiredSampleRate + '\n' +
		// 					'oneData Length: ' + oneData.length + '\n' );
		
		if ( desiredSampleRate ) {
			oneData = interpolateBuffers( oneData, desiredSampleRate, sampleRate );
		}
		
		// 压缩至需要的采样率
		// for changing the sampling rate, reference:
		// http://stackoverflow.com/a/28977136/552182
		function interpolateBuffers( data, desiredSampleRate, originalSampleRate ) {
			// console.log('interpolateBuffers');
			var fitCount = Math.round( data.length * ( desiredSampleRate / originalSampleRate ) );
			var newData = [];
			
			var springFactor = Number( (data.length-1) / (fitCount-1) );
			newData[0] = data[0];
			
			for ( var i = 1; i < fitCount - 1; i++ ) {
				var temp = i * springFactor;
				var before = Number( Math.floor( temp ) ).toFixed();
				var after = Number( Math.ceil( temp ) ).toFixed();
				var atPoint = temp - before;
				newData[i] = linearInterpolate( data[before], data[after], atPoint );
			}
			
			newData[fitCount - 1] = data[data.length - 1];	// for new allocation
			return newData;
		}
			
		function linearInterpolate( dataBefore, dataAfter, atPoint ) {
			//console.log('linearInterpolate');
			return dataBefore + ( dataAfter - dataBefore ) * atPoint;
		}
							
		// 拼接数据流
		function mergeBuffers( channelBuffer, audioDataLength) {
			// console.log('mergeBuffers');
			var result = new Float64Array( audioDataLength );
			var offset = 0;
			var bufferLength = channelBuffer.length;
			//console.log( 'bufferLength: ' + bufferLength );
			for ( var i =0; i < bufferLength; i++ ) {
				var oneBuffer = channelBuffer[i];
				//console.log( 'audioDataLength: ' + audioDataLength );
				//console.log( 'oneBuffer Length: ' + oneBuffer.length );
				result.set( oneBuffer, offset );
				offset += oneBuffer.length;
			}
			
			return result;
		}
		
		// 通道合并
		function interleave( leftBuffer, rightBuffer ) {
			// console.log('interleave');
			var totalLength = leftBuffer.length + rightBuffer.length;
			
			var result = new Float64Array( totalLength );
			var inputIndex = 0;
			
			for ( var index = 0; index < totalLength; ) {
				result[index++] = leftBuffer[inputIndex];
				result[index++] = rightBuffer[inputIndex];
				inputIndex++;
			}
			
			return result;
		}	
		
		function writeUTFBytes( view, offset, string ) {
			//console.log('writeUTFBytes');
			var strLength = string.length;
			
			for ( var i = 0 ; i < strLength; i++ ) {
				view.setUint8( offset + i, string.charCodeAt( i ) );
			}
		}
		
		interleaved = oneData;
		
		var interleavedLength = interleaved.length;
		// console.log( 'interleavedLength: ' + interleavedLength );
		
		// create wav file
		var finalBufferLength = 44 + interleavedLength * 2;
		
		var finalBuffer = new ArrayBuffer( finalBufferLength );
		
		var finalView = new DataView( finalBuffer );
		
		// 资源交换文件标识符
		writeUTFBytes( finalView, 0, 'RIFF' );
		// RIFF 区块长度
		finalView.setUint32( 4, 44 + interleavedLength * 2, true );
		// RIFF 类型，WAV 文件标志
		writeUTFBytes( finalView, 8, 'WAVE' );
		// 波形格式标志
		writeUTFBytes( finalView, 12, 'fmt ' );
		// 格式区块长度
		finalView.setUint32( 16, 16, true );
		// 采样格式
		finalView.setUint16( 20, 1, true );
		// 通道数
		finalView.setUint16( 22, channelNum, true );
		// 采样率,每秒样本数,表示每个通道的播放速度
		finalView.setUint32( 24, desiredSampleRate, true );
		// 比特率 byte rate = sample rate * block align
		// 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
		finalView.setUint32( 28, desiredSampleRate * 2, true );
		// block align = channelNum * bytes per sample
		// 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
		finalView.setUint16( 32, channelNum * 2, true );
		// bits per sample
		// 每样本数据位数
		finalView.setUint16( 34, 16, true );
		// 数据标识符
		writeUTFBytes( finalView, 36, 'data' );
		// 数据区块长度
		finalView.setUint32( 40, interleavedLength * 2, true );
		
		// write the PCM samples
		var len = interleavedLength;
		var index = 44;
		var volume = 1;
		for ( var i = 0; i < len; i++ ) {
			finalView.setInt16( index, interleaved[i] * ( 0x7FFF * volume ), true );
			index += 2;
		}
		
		// console.log( 'finalBuffer Length: ' + finalBuffer.byteLength + finalBuffer.toString() );
		
		return finalBuffer;
	}
	
	function clearRecordedData() {
		sendBuffer = [];
		recording = false;
	}
}