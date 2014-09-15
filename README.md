
# Foxtrot

A simple routing network

## Installation

For Ubuntu, if you get the following error when running `npm install`: 
```
make: Entering directory `/home/maraoz/git/foxtrot/node_modules/mdns/build'
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_sd.o
In file included from ../src/dns_sd.cpp:1:0:
../src/mdns.hpp:31:20: fatal error: dns_sd.h: No such file or directory
  #include <dns_sd.h>
                  ^
compilation terminated.
make: *** [Release/obj.target/dns_sd_bindings/src/dns_sd.o] Error 1
make: Leaving directory `/home/maraoz/git/foxtrot/node_modules/mdns/build'
gyp ERR! build error 

```

you should run:
```
sudo apt-get install libavahi-compat-libdnssd-dev
```
