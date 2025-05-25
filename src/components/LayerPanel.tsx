'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Layers, X, GripVertical } from 'lucide-react';
import { State } from '../types/types';
import { Input } from "@/components/ui/input";
import { getCurrentLayers } from '../hooks/layers/layerStateManager';
import { DragDropContext, Draggable, DropResult } from 'react-beautiful-dnd';
import StrictModeDroppable from './StrictModeDroppable';

interface LayerManagerProps {
  state: State;
  addLayer: () => void;
  removeLayer: (_id: string) => void;
  updateLayerVisibility: (_id: string, _visible: boolean) => void;
  updateLayerOpacity: (_id: string, _opacity: number) => void;
  setActiveLayerId: (_id: string) => void;
  updateLayerName: (_id: string, _name: string) => void;
  reorderLayers: (_sourceIndex: number, _targetIndex: number) => void;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  state,
  addLayer,
  removeLayer,
  updateLayerVisibility,
  updateLayerOpacity,
  setActiveLayerId,
  updateLayerName,
  reorderLayers
}) => {
  const layers = getCurrentLayers(state);
  const [enabled, setEnabled] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setEnabled(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderLayers(result.source.index, result.destination.index);
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-2 rounded-md shadow-sm">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
        <h3 className="text-xs font-semibold flex items-center">
          <Layers className="mr-1" size={14} /> Layers
        </h3>
        <Button
          onClick={addLayer}
          className="add-action h-6 w-25 bg-gray-700 hover:bg-gray-600 text-gray-200"
        >
          Add Layer
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <StrictModeDroppable droppableId="layers">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {layers.map((layer, index) => (
                <Draggable 
                  key={layer.id} 
                  draggableId={layer.id} 
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center bg-gray-700 p-2 rounded ${
                        snapshot.isDragging ? 'opacity-50' : ''
                      }`}
                    >
                      <div {...provided.dragHandleProps} className="mr-2 cursor-move">
                        <GripVertical size={14} />
                      </div>
                      
                      <div className="flex-grow">
                        {editingLayerId === layer.id ? (
                          <Input
                            value={layer.name}
                            onChange={(e) => updateLayerName(layer.id, e.target.value)}
                            onBlur={() => setEditingLayerId(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingLayerId(null)}
                            autoFocus
                            className="h-6 text-xs bg-gray-600 text-white border-gray-500"
                          />
                        ) : (
                          <span 
                            className={`truncate cursor-pointer ${
                              layer.id === state.activeLayerId ? 'font-bold' : ''
                            }`}
                            onClick={() => setActiveLayerId(layer.id)}
                            onDoubleClick={() => setEditingLayerId(layer.id)}
                          >
                            {layer.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-2">
                        <Switch
                          checked={layer.visible}
                          onCheckedChange={(checked) => updateLayerVisibility(layer.id, checked)}
                          className="h-4 w-7"
                        />
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={[layer.opacity]}
                          onValueChange={(value) => updateLayerOpacity(layer.id, value[0])}
                          className="w-14"
                        />
                        <Button 
                          onClick={() => removeLayer(layer.id)}
                          disabled={layers.length === 1}
                          variant="destructive"
                          size="icon"
                          className="h-4 w-4 p-0"
                        >
                          <X size={10} />
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>
    </div>
  );
};

export default LayerManager;