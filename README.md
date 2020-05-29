![Logo](admin/sainlogic.png)
# ioBroker.sainlogic

[![NPM version](http://img.shields.io/npm/v/iobroker.sainlogic.svg)](https://www.npmjs.com/package/iobroker.sainlogic)
[![Downloads](https://img.shields.io/npm/dm/iobroker.sainlogic.svg)](https://www.npmjs.com/package/iobroker.sainlogic)
![Number of Installations (latest)](http://iobroker.live/badges/sainlogic-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/sainlogic-stable.svg)
[![Dependency Status](https://img.shields.io/david/phifogg/iobroker.sainlogic.svg)](https://david-dm.org/phifogg/iobroker.sainlogic)
[![Known Vulnerabilities](https://snyk.io/test/github/phifogg/ioBroker.sainlogic/badge.svg)](https://snyk.io/test/github/phifogg/ioBroker.sainlogic)

[![NPM](https://nodei.co/npm/iobroker.sainlogic.png?downloads=true)](https://nodei.co/npm/iobroker.sainlogic/)

## sainlogic adapter for ioBroker

Read data from a sainlogic based weather station

## Supported devices

Basically any device working with the sainlogic hardware, the firmware usually reports as 'EasyWeather Vx.x.x)'.

Known working devices:
1. ELV WS980Wifi
1. Eurochron EFWS2900  (Listener mode only)
1. Froggit WH400SE

## Usage

The adapter supports two modes to showw data of your weather station.

### Listener mode:
With latest firmware releases the weather station supports sending data to a custom server. The adapter will act as such a server. The setup needs two steps:

#### Configure Weather station
Use the 'WS View'app on your mobile device to configure the weatherstation. Configure the following settings for customized server settings:
- Server: IP/Hostname of your IOBroker server
- Path: anything, just remember it for the adapter configuration
- Port: any number between 1024 and 65000 (default is 45000), needs to be unique and free on your IOBroker system
- Station ID: not used
- Station Key: not used
- Protocol Type: WeatherUnderground
- Upload Interval: anyting supported by your weather station

#### Configure the Listener
In the instance configuration choose the tab 'Listener' and set the following:
- Active: true
- IP: choose the IP of your IOBroker which the weatherstation will be able to connect to (default is 0.0.0.0 to allow all IPs), this is mainly relevant if you have multiple networks, otherwise the default will do
- Port: Enter the same port as in the WS View app
- Path: Enter the same path as in the WS View app

Save.
The listener will start and wait on incoming connections. Based on your interval you should see in the log a message ' Listener received update: ...' with the data.

### Scheduler mode:
If your weather station supports pulling for data you can configure the scheduler to do so. The protocol used is based on [WS980 documentation](https://github.com/RrPt/WS980).

#### Configure the scheduler
In the instance configuration choose the tab 'Scheduler' and set the following:
- Active: true
- IP: choose the IP of your weather station, you should make sure that the IP is fixed and does not change
- Port: Enter the port to connect to (default is 45000)
- Interval: Enter an interval in seconds (I would recommend at minimum 10 seconds to not overload the system or network)

Save.

The schheduler will start and connect to the weather station after the first interval time. You should see message in the log like 'Scheduler pulling for new data'. If you set the log mode to debug you will also see the data strings received.

## Changelog

Latest version

#### 0.6.1 Added win heading

For detailed change log or previous versions check io-package.json


## License
MIT License

Copyright (c) 2020 Fogg <foggch@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.