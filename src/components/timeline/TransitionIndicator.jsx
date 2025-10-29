import { Group, RegularPolygon, Text } from 'react-konva';

/**
 * TransitionIndicator Component
 *
 * Visual indicator displayed between two adjacent clips to show a transition effect.
 * Renders as a diamond shape with a hover tooltip showing transition type.
 */
function TransitionIndicator({
  x,
  y,
  transition,
  isSelected,
  onClick,
  onDoubleClick,
}) {
  const size = 12;
  const fillColor = isSelected ? '#3B82F6' : '#8B5CF6';
  const strokeColor = isSelected ? '#1E40AF' : '#6D28D9';

  // Map transition type to display name
  const transitionTypeNames = {
    fade: 'Fade',
    crossfade: 'Crossfade',
    fadeToBlack: 'Fade to Black',
    wipeLeft: 'Wipe Left',
    wipeRight: 'Wipe Right',
    dissolve: 'Dissolve',
  };

  const displayName = transitionTypeNames[transition.type] || transition.type;

  return (
    <Group
      x={x}
      y={y}
      onClick={onClick}
      onTap={onClick}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
    >
      {/* Diamond shape (rotated square) */}
      <RegularPolygon
        sides={4}
        radius={size}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
        rotation={45}
        shadowBlur={isSelected ? 8 : 4}
        shadowColor="black"
        shadowOpacity={0.3}
        perfectDrawEnabled={false}
        listening={true}
      />

      {/* Optional: Show transition type on hover
          For now we'll keep it simple and show type in a separate editor panel */}

      {/* Duration indicator (small text below diamond) */}
      <Text
        x={-20}
        y={size + 5}
        text={`${transition.duration.toFixed(1)}s`}
        fontSize={10}
        fill="#FFFFFF"
        align="center"
        width={40}
        perfectDrawEnabled={false}
        listening={false}
      />
    </Group>
  );
}

export default TransitionIndicator;
