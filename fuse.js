const { FuseBox } = require('fuse-box');

let fuse = new FuseBox({
    homeDir: 'src/',
    sourcemaps: true,
    output: 'build/$name.js'
});

fuse.bundle('app')
    .instructions('> index.js');
fuse.run();