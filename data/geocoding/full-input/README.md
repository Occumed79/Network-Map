# Exact provider geocoding input

This directory contains the gzip-compressed and base64-encoded form of the 1,431 approved provider records extracted from the cleaned U.S. Embassy provider-list package.

The full-run workflow concatenates the numbered parts, decodes and decompresses them, and refuses to continue unless the reconstructed JSONL contains exactly 1,431 records.

Only geocoder results meeting the strict exact-match policy may enter the accepted output. Roads, cities, postal centroids, administrative areas, fuzzy facility matches, and other approximations remain unresolved.
