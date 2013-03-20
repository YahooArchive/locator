#!/usr/bin/env perl

use strict;
use warnings;
use Data::Dumper;

our @FIND = qw(
    /home/y/conf/keydb/mcs_mweb.keydb                                           
    /home/y/conf/keydb/mobile.build.keydb
    /home/y/conf/ymobile/dist/distkey                                           
);

sub main {
    my @found;
    foreach my $find ( @FIND ) {
        push(@found, $find) if -e $find;
    }
    print Dumper(\@found);

#   use ysecure;
#   my $username = ycrGetKey('mobile.build.user.name');
#   print "-- USER $username\n";
}
main();

