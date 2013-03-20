#!/usr/bin/env perl

use strict;
use warnings;
use Data::Dumper;

our @FIND = qw(
    Cwd
    Data::Dumper
    File::Basename
    File::Path
    Getopt::Long
    HTTP::Status
    Pod::Usage
    XML::LibXML
    Yahoo::Backyard::SingleSignOn
    ysecure
);

sub main {
    my @found;
    foreach my $find ( @FIND ) {
        eval "use $find";
        unless ($@) {
            push @found, $find;
        }
    }
    print Dumper(\@found);
}
main();

