#!/bin/bash
# Controls brightness across all displays using native Linux commands
# Tries xrandr (software), sysfs (laptop hardware), and ddcutil (external hardware)

BRIGHTNESS=$1
SUCCESS_COUNT=0
TOTAL_METHODS=0

if [ -z "$BRIGHTNESS" ]; then
    echo "Usage: $0 <brightness_value>"
    exit 1
fi

if [ "$BRIGHTNESS" -lt 0 ] || [ "$BRIGHTNESS" -gt 100 ]; then
    echo "Error: Brightness must be between 0 and 100"
    exit 1
fi

echo "Setting brightness to ${BRIGHTNESS}%..."

# Apply software brightness via xrandr to all connected displays
echo ""
echo "Method 1: xrandr (software brightness)"
if command -v xrandr &> /dev/null; then
    PERCENTAGE=$(echo "scale=2; $BRIGHTNESS / 100" | bc)
    DISPLAYS=$(xrandr | grep " connected" | awk '{print $1}')
    
    for DISPLAY in $DISPLAYS; do
        if xrandr --output "$DISPLAY" --brightness "$PERCENTAGE" 2>/dev/null; then
            echo "  Set brightness to ${BRIGHTNESS}% on $DISPLAY"
            ((SUCCESS_COUNT++))
        else
            echo "  Failed on $DISPLAY"
        fi
        ((TOTAL_METHODS++))
    done
else
    echo "  xrandr not available"
fi

# Apply hardware brightness via sysfs for laptop built-in displays
echo ""
echo "Method 2: sysfs (hardware brightness for laptop)"
if [ -d "/sys/class/backlight" ]; then
    for BACKLIGHT in /sys/class/backlight/*; do
        if [ -d "$BACKLIGHT" ]; then
            BACKLIGHT_NAME=$(basename "$BACKLIGHT")
            MAX_BRIGHTNESS=$(cat "$BACKLIGHT/max_brightness" 2>/dev/null)
            
            if [ -n "$MAX_BRIGHTNESS" ]; then
                TARGET_BRIGHTNESS=$(echo "($BRIGHTNESS * $MAX_BRIGHTNESS) / 100" | bc)
                
                if echo "$TARGET_BRIGHTNESS" > "$BACKLIGHT/brightness" 2>/dev/null; then
                    echo "  Set brightness to ${BRIGHTNESS}% on $BACKLIGHT_NAME"
                    ((SUCCESS_COUNT++))
                elif echo "$TARGET_BRIGHTNESS" | tee "$BACKLIGHT/brightness" &>/dev/null; then
                    echo "  Set brightness to ${BRIGHTNESS}% on $BACKLIGHT_NAME"
                    ((SUCCESS_COUNT++))
                else
                    echo "  Failed on $BACKLIGHT_NAME (permission denied - add user to video group)"
                fi
                ((TOTAL_METHODS++))
            fi
        fi
    done
else
    echo "  sysfs backlight not available"
fi

# Apply hardware brightness via ddcutil for external DDC/CI monitors
echo ""
echo "Method 3: ddcutil (hardware brightness for external monitors)"
if command -v ddcutil &> /dev/null; then
    DISPLAYS=$(ddcutil detect --brief 2>/dev/null | grep "^Display" | awk '{print $2}')
    
    if [ -n "$DISPLAYS" ]; then
        for DISPLAY_NUM in $DISPLAYS; do
            if ddcutil setvcp 10 "$BRIGHTNESS" --display "$DISPLAY_NUM" 2>/dev/null; then
                echo "  Set brightness to ${BRIGHTNESS}% on Display $DISPLAY_NUM"
                ((SUCCESS_COUNT++))
            else
                echo "  Failed on Display $DISPLAY_NUM"
            fi
            ((TOTAL_METHODS++))
        done
    else
        echo "  No DDC/CI monitors detected"
    fi
else
    echo "  ddcutil not available (install: sudo apt install ddcutil)"
fi

# Report results
echo ""
echo "=========================================="
if [ $SUCCESS_COUNT -gt 0 ]; then
    echo "SUCCESS: Applied to $SUCCESS_COUNT out of $TOTAL_METHODS methods"
    exit 0
else
    echo "FAILED: No methods succeeded"
    echo ""
    echo "Troubleshooting:"
    echo "  1. For xrandr: Should work by default"
    echo "  2. For sysfs: Add user to video group: sudo usermod -aG video \$USER"
    echo "  3. For ddcutil: Install with: sudo apt install ddcutil"
    echo "     Then: sudo modprobe i2c-dev"
    echo "     And: sudo usermod -aG i2c \$USER"
    exit 1
fi
