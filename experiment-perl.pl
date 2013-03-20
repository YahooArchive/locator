#!/usr/bin/env perl

use strict;
use warnings;
use Data::Dumper;

our @FIND = qw(
    Yahoo::Backyard::SingleSignOn
    HTTP::Status
    XML::LibXML
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

