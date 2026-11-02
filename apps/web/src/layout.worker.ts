import { layoutGraph } from '../../../packages/core/src/layout';
self.onmessage=event=>self.postMessage(layoutGraph(event.data));
